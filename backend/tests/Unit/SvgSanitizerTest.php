<?php

namespace Tests\Unit;

use App\Services\SvgSanitizer;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SvgSanitizerTest extends TestCase
{
    public function test_plain_svg_is_safe(): void
    {
        $this->assertTrue(SvgSanitizer::isSafe(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#112233"/></svg>'
        ));
    }

    public function test_embedded_images_and_local_fragments_are_allowed(): void
    {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">'
            .'<defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs>'
            .'<rect fill="url(#g)" width="1" height="1"/>'
            .'<image xlink:href="data:image/png;base64,iVBORw0KGgo="/>'
            .'</svg>';

        $this->assertTrue(SvgSanitizer::isSafe($svg));
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function unsafeDocuments(): array
    {
        return [
            'script element' => ['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
            'event handler' => ['<svg xmlns="http://www.w3.org/2000/svg"><rect onload="alert(1)"/></svg>'],
            'external link' => ['<svg xmlns="http://www.w3.org/2000/svg"><use href="https://evil.example/x.svg#a"/></svg>'],
            'javascript style' => ['<svg xmlns="http://www.w3.org/2000/svg"><rect style="fill:url(javascript:alert(1))"/></svg>'],
            'doctype entity' => ['<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg"><text>&x;</text></svg>'],
            'foreign object' => ['<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body/></foreignObject></svg>'],
            'not an svg' => ['<html><body>nope</body></html>'],
            'malformed xml' => ['<svg><rect></svg>'],
        ];
    }

    #[DataProvider('unsafeDocuments')]
    public function test_unsafe_svg_is_rejected(string $svg): void
    {
        $this->assertFalse(SvgSanitizer::isSafe($svg));

        $this->expectException(ValidationException::class);

        SvgSanitizer::assertSafe($svg);
    }
}
