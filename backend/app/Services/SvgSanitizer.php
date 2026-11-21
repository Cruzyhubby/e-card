<?php

namespace App\Services;

use DOMDocument;
use DOMElement;
use DOMNode;
use Illuminate\Validation\ValidationException;

class SvgSanitizer
{
    /** Elements that can execute code, load documents, or animate attributes. */
    private const BLOCKED_ELEMENTS = [
        'script', 'foreignobject', 'iframe', 'object', 'embed', 'audio', 'video',
        'canvas', 'style', 'link', 'meta', 'base', 'handler', 'a',
        'animate', 'animatemotion', 'animatetransform', 'set', 'discard',
    ];

    public static function assertSafe(string $svg): void
    {
        $issue = self::inspect($svg);

        if ($issue !== null) {
            throw ValidationException::withMessages([
                'file' => [$issue],
            ]);
        }
    }

    public static function isSafe(string $svg): bool
    {
        return self::inspect($svg) === null;
    }

    private static function inspect(string $svg): ?string
    {
        // XML entities and stylesheet processing instructions enable XXE and
        // remote stylesheet loading, so reject them before parsing.
        if (preg_match('/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i', $svg) === 1) {
            return 'SVG designs may not contain document type, entity, or stylesheet declarations.';
        }

        $document = new DOMDocument;
        $previous = libxml_use_internal_errors(true);
        $loaded = $document->loadXML($svg, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_COMPACT);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        if (! $loaded || $document->documentElement === null
            || strtolower($document->documentElement->localName) !== 'svg') {
            return 'The file is not a valid SVG document.';
        }

        return self::walk($document->documentElement);
    }

    private static function walk(DOMNode $node): ?string
    {
        if ($node instanceof DOMElement) {
            $name = strtolower($node->localName);

            if (in_array($name, self::BLOCKED_ELEMENTS, true)) {
                return 'SVG designs may not contain <'.$name.'> elements.';
            }

            foreach ($node->attributes as $attribute) {
                $attributeName = strtolower($attribute->localName);

                if (str_starts_with($attributeName, 'on')) {
                    return 'SVG designs may not contain event handler attributes.';
                }

                if (in_array($attributeName, ['href', 'xlink:href'], true)) {
                    $value = trim($attribute->value);

                    if ($value !== '' && ! str_starts_with($value, '#')
                        && preg_match('#^data:image/(png|jpe?g|gif|webp);base64,#i', $value) !== 1) {
                        return 'SVG links may only reference local fragments or embedded images.';
                    }
                }

                if ($attributeName === 'style'
                    && preg_match('/javascript:|expression\s*\(|@import|url\s*\(\s*["\']?(?:https?:)?\/\//i', $attribute->value) === 1) {
                    return 'SVG designs may not contain external or scriptable styles.';
                }
            }
        }

        foreach ($node->childNodes as $child) {
            $issue = self::walk($child);

            if ($issue !== null) {
                return $issue;
            }
        }

        return null;
    }
}
