<?php

namespace App\Services;

use App\Models\Event;
use App\Models\Guest;
use BaconQrCode\Renderer\GDLibRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Support\Facades\Log;
use Throwable;

class EcardRendererService
{
    public const WIDTH = 480;

    public const HEIGHT = 680;

    private const SERIF = "'Instrument Serif', Georgia, 'Times New Roman', serif";

    private const SANS = "'Plus Jakarta Sans', Helvetica, Arial, sans-serif";

    /**
     * Palette defaults per template. Stored event config always wins.
     *
     * @var array<string, array{bg_color: string, accent_color: string, text_color: string}>
     */
    private const TEMPLATE_PALETTES = [
        'noir' => [
            'bg_color' => '#0B1120',
            'accent_color' => '#C084FC',
            'text_color' => '#F8FAFC',
        ],
        'ivory' => [
            'bg_color' => '#FBF7F0',
            'accent_color' => '#B08D57',
            'text_color' => '#2A241C',
        ],
        'emerald' => [
            'bg_color' => '#062C26',
            'accent_color' => '#6EE7B7',
            'text_color' => '#ECFDF5',
        ],
        'terracotta' => [
            'bg_color' => '#3B1F16',
            'accent_color' => '#E8A87C',
            'text_color' => '#FFF4EC',
        ],
        'royal' => [
            'bg_color' => '#1E1B4B',
            'accent_color' => '#F5D67B',
            'text_color' => '#F8FAFC',
        ],
    ];

    /**
     * @return array{template: string, bg_color: string, accent_color: string, text_color: string, name_y: int, qr_position: string, qr_size: int}
     */
    public static function defaultConfig(?string $accentColor = null): array
    {
        return [
            'template' => 'noir',
            'bg_color' => self::TEMPLATE_PALETTES['noir']['bg_color'],
            'accent_color' => self::sanitizeHex($accentColor) ?? self::TEMPLATE_PALETTES['noir']['accent_color'],
            'text_color' => self::TEMPLATE_PALETTES['noir']['text_color'],
            'name_y' => 58,
            'qr_position' => 'bottom-center',
            'qr_size' => 132,
        ];
    }

    /**
     * Resolve a safe, complete e-card configuration for an event.
     *
     * @return array{template: string, bg_color: string, accent_color: string, text_color: string, name_y: int, qr_position: string, qr_size: int}
     */
    public function configFor(Event $event): array
    {
        $config = is_array($event->ecard_config) ? $event->ecard_config : [];

        $template = is_string($config['template'] ?? null) && array_key_exists($config['template'], self::TEMPLATE_PALETTES)
            ? $config['template']
            : 'noir';

        $palette = self::TEMPLATE_PALETTES[$template];

        $qrPosition = in_array($config['qr_position'] ?? null, config('eclat.ecard.qr_positions'), true)
            ? (string) $config['qr_position']
            : 'bottom-center';

        return [
            'template' => $template,
            'bg_color' => self::sanitizeHex($config['bg_color'] ?? null) ?? $palette['bg_color'],
            'accent_color' => self::sanitizeHex($config['accent_color'] ?? null)
                ?? self::sanitizeHex($event->accent_color)
                ?? $palette['accent_color'],
            'text_color' => self::sanitizeHex($config['text_color'] ?? null) ?? $palette['text_color'],
            'name_y' => max(20, min(80, (int) ($config['name_y'] ?? 58))),
            'qr_position' => $qrPosition,
            'qr_size' => max(88, min(180, (int) ($config['qr_size'] ?? 132))),
        ];
    }

    /**
     * Rasterise any payload (e.g. an e-card download URL) into a scannable PNG.
     */
    public function qrPng(string $content, int $size = 720): string
    {
        return (new Writer(new GDLibRenderer($size, 2)))->writeString($content);
    }

    /**
     * Render the card exactly as the organizer designed it in the studio
     * (admin/src/components/ui/EcardPreview.jsx), expressed on the 480×680 canvas.
     */
    public function render(Guest $guest, Event $event): string
    {
        $config = $this->configFor($event);
        $accent = $config['accent_color'];
        $textColor = $config['text_color'];
        $monogram = $this->initials($event->host_name);

        $svg = [];
        $svg[] = sprintf(
            '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d" role="img" aria-label="%s">',
            self::WIDTH,
            self::HEIGHT,
            self::WIDTH,
            self::HEIGHT,
            $this->escape($event->title.' invitation')
        );
        $svg[] = $this->background($accent);
        $svg[] = sprintf('<rect width="%d" height="%d" fill="%s"/>', self::WIDTH, self::HEIGHT, $config['bg_color']);
        $svg[] = sprintf('<rect width="%d" height="%d" fill="url(#eclat-glow-top)"/>', self::WIDTH, self::HEIGHT);
        $svg[] = sprintf('<rect width="%d" height="%d" fill="url(#eclat-glow-bottom)"/>', self::WIDTH, self::HEIGHT);
        $svg[] = $this->text(513.6, 292, $monogram, $textColor, 211, '400', 'end', 0, 0.045, self::SERIF);
        $svg[] = sprintf(
            '<rect x="16.32" y="23.12" width="447.36" height="633.76" rx="17.6" fill="none" stroke="%s" stroke-opacity="0.26"/>',
            $accent
        );

        $svg[] = sprintf('<circle cx="240" cy="60" r="21.6" fill="none" stroke="%s" stroke-opacity="0.44"/>', $accent);
        $svg[] = $this->text(240, 66.5, $monogram, $accent, 17.28, '400', 'middle', 0, 1.0, self::SERIF);
        $svg[] = $this->text(240, 107, 'YOU ARE INVITED', $accent, 8.64, '600', 'middle', 3.63);

        $titleLines = $this->headline($event->title, 27, 2);
        $titleTop = 121.44;
        foreach ($titleLines as $index => $line) {
            $svg[] = $this->text(
                240,
                $titleTop + ($index * 35.6) + 29.4,
                $line,
                $textColor,
                34.56,
                '400',
                'middle',
                -0.41,
                1.0,
                self::SERIF
            );
        }

        $hostTop = $titleTop + (count($titleLines) * 35.6) + 7.68;
        $svg[] = $this->text(
            240,
            $hostTop + 12.8,
            mb_strtoupper('Hosted by '.$event->host_name),
            $textColor,
            11.04,
            '400',
            'middle',
            2.43,
            0.6
        );

        $dividerY = $hostTop + 36.48;
        $svg[] = sprintf(
            '<line x1="43.2" y1="%s" x2="222.96" y2="%s" stroke="%s" stroke-opacity="0.3"/>',
            $this->num($dividerY),
            $this->num($dividerY),
            $accent
        );
        $svg[] = sprintf(
            '<line x1="257.04" y1="%s" x2="436.8" y2="%s" stroke="%s" stroke-opacity="0.3"/>',
            $this->num($dividerY),
            $this->num($dividerY),
            $accent
        );
        $svg[] = sprintf(
            '<rect x="237.36" y="%s" width="5.28" height="5.28" fill="%s" transform="rotate(45 240 %s)"/>',
            $this->num($dividerY - 2.64),
            $accent,
            $this->num($dividerY)
        );

        $dateLabel = $event->event_date?->format('D, j M Y') ?? '—';
        $timeLabel = $event->start_time_label;
        $dateWidth = 101.0;
        $timeWidth = mb_strlen($timeLabel) >= 8 ? 55.0 : 46.0;
        $columnGap = 33.6;
        $groupStart = 240 - (($dateWidth + $timeWidth + ($columnGap * 2) + 1) / 2);
        $dateX = $groupStart + ($dateWidth / 2);
        $separatorX = $groupStart + $dateWidth + $columnGap + 0.5;
        $timeX = $separatorX + 0.5 + $columnGap + ($timeWidth / 2);

        $metaTop = $dividerY + 17.04;
        $svg[] = $this->text($dateX, $metaTop + 8.96, 'DATE', $textColor, 7.68, '400', 'middle', 2.3, 0.6);
        $svg[] = $this->text($timeX, $metaTop + 8.96, 'TIME', $textColor, 7.68, '400', 'middle', 2.3, 0.6);
        $svg[] = $this->text($dateX, $metaTop + 30.4, $dateLabel, $textColor, 12.48, '600');
        $svg[] = $this->text($timeX, $metaTop + 30.4, $timeLabel, $textColor, 12.48, '600');
        $svg[] = sprintf(
            '<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-opacity="0.18"/>',
            $this->num($separatorX),
            $this->num($metaTop + 3.36),
            $this->num($separatorX),
            $this->num($metaTop + 34.56),
            $textColor
        );

        $venueTop = $metaTop + 48.48;
        $venueLines = $this->wrap($event->venue ?: 'Venue to be announced', 56, 2);
        foreach ($venueLines as $index => $line) {
            $svg[] = $this->text(
                240,
                $venueTop + 13.9 + ($index * 18.72),
                $line,
                $textColor,
                11.52,
                '400',
                'middle',
                0,
                0.6
            );
        }

        $description = trim((string) $event->description);
        if ($description !== '') {
            $descriptionTop = $venueTop + (count($venueLines) * 18.72) + 8.64;
            foreach ($this->wrap($description, 62, 2) as $index => $line) {
                $svg[] = $this->text(
                    240,
                    $descriptionTop + 11.68 + ($index * 15.6),
                    $line,
                    $textColor,
                    9.6,
                    '400',
                    'middle',
                    0,
                    0.5
                );
            }
        }

        $svg[] = $this->guestBlock($guest, $config, $textColor, $accent);
        $svg[] = $this->qrBlock($guest, $config, $accent, $textColor);

        $svg[] = '</svg>';

        return implode('', $svg);
    }

    private function background(string $accent): string
    {
        return $this->fontStyles()
            .'<defs>'
            .'<radialGradient id="eclat-glow-top" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1"'
            .' gradientTransform="translate(422.4 -27.2) scale(336 353.6)">'
            .sprintf('<stop offset="0" stop-color="%s" stop-opacity="0.2"/>', $accent)
            .sprintf('<stop offset="0.62" stop-color="%s" stop-opacity="0"/>', $accent)
            .'</radialGradient>'
            .'<radialGradient id="eclat-glow-bottom" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1"'
            .' gradientTransform="translate(19.2 707.2) scale(278.4 312.8)">'
            .sprintf('<stop offset="0" stop-color="%s" stop-opacity="0.133"/>', $accent)
            .sprintf('<stop offset="0.6" stop-color="%s" stop-opacity="0"/>', $accent)
            .'</radialGradient>'
            .'</defs>';
    }

    /**
     * Embed the studio's webfonts so a downloaded SVG keeps the designed typography
     * even when it is opened offline or embedded as an image.
     */
    private function fontStyles(): string
    {
        static $styles = null;

        if ($styles !== null) {
            return $styles;
        }

        $faces = '';

        foreach ([
            "'Instrument Serif'" => ['instrument-serif-latin.woff2', '400'],
            "'Plus Jakarta Sans'" => ['plus-jakarta-sans-latin.woff2', '400 800'],
        ] as $family => [$file, $weight]) {
            $path = resource_path('fonts/'.$file);

            if (! is_file($path)) {
                continue;
            }

            $faces .= sprintf(
                "@font-face{font-family:%s;font-style:normal;font-weight:%s;src:url(data:font/woff2;base64,%s) format('woff2');}",
                $family,
                $weight,
                base64_encode((string) file_get_contents($path))
            );
        }

        return $styles = $faces === '' ? '' : '<style>'.$faces.'</style>';
    }

    private function guestBlock(Guest $guest, array $config, string $textColor, string $accent): string
    {
        $lines = $this->headline($guest->name, 34, 2);
        $lineHeight = 28.0;
        $hasTable = $guest->table_number !== null;
        $nameHeight = count($lines) * $lineHeight;
        $blockHeight = $nameHeight + 7.24 + ($hasTable ? 19.92 : 0);
        $top = (self::HEIGHT * $config['name_y'] / 100) - ($blockHeight / 2);

        $html = [];
        foreach ($lines as $index => $line) {
            $html[] = $this->text(
                240,
                $top + ($index * $lineHeight) + 23,
                $line,
                $textColor,
                25.92,
                '400',
                'middle',
                0,
                1.0,
                self::SERIF
            );
        }

        $underlineY = $top + $nameHeight + 6.24;
        $html[] = sprintf(
            '<line x1="218.4" y1="%s" x2="261.6" y2="%s" stroke="%s"/>',
            $this->num($underlineY),
            $this->num($underlineY),
            $accent
        );

        if ($hasTable) {
            $label = 'TABLE '.$guest->table_number
                .($guest->seat_number !== null ? ' · SEAT '.$guest->seat_number : '');
            $html[] = $this->text(240, $underlineY + 17.6, $label, $accent, 9.12, '600', 'middle', 2.74);
        }

        return implode('', $html);
    }

    private function qrBlock(Guest $guest, array $config, string $accent, string $textColor): string
    {
        $widthPercent = max(16.0, min(34.0, $config['qr_size'] / self::WIDTH * 100));
        $boxWidth = $widthPercent / 100 * self::WIDTH;
        $padding = 7.2;
        // The studio's white frame is square: width includes the 1.5cqw padding (border-box).
        $boxHeight = $boxWidth;
        $labelGap = 6.24;
        $labelHeight = 10.8;
        // The studio anchors the whole QR + caption group 5.5% above the card bottom.
        $blockBottom = self::HEIGHT * 0.945;

        $boxX = match ($config['qr_position']) {
            'bottom-left' => self::WIDTH * 0.07,
            'bottom-right' => self::WIDTH * 0.93 - $boxWidth,
            default => (self::WIDTH - $boxWidth) / 2,
        };
        $boxY = $blockBottom - $labelHeight - $labelGap - $boxHeight;
        $qrSize = (int) round($boxWidth - ($padding * 2));

        $html = [];
        $html[] = '<defs><filter id="eclat-qr-shadow" x="-40%" y="-40%" width="180%" height="180%">'
            .'<feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#000000" flood-opacity="0.45"/>'
            .'</filter></defs>';
        $html[] = sprintf(
            '<rect x="%s" y="%s" width="%s" height="%s" rx="5.28" fill="#FFFFFF" filter="url(#eclat-qr-shadow)"/>',
            $this->num($boxX),
            $this->num($boxY),
            $this->num($boxWidth),
            $this->num($boxHeight)
        );
        $html[] = $this->qrSvg(
            rtrim((string) config('app.url'), '/').'/i/'.$guest->qr_token,
            $qrSize,
            (int) round($boxX + $padding),
            (int) round($boxY + $padding),
            $accent,
            $textColor
        );
        $html[] = $this->text(
            $boxX + ($boxWidth / 2),
            $boxY + $boxHeight + $labelGap + 7.9,
            'SCAN AT THE GATE',
            $textColor,
            7.2,
            '600',
            'middle',
            1.87,
            0.5
        );

        return implode('', $html);
    }

    private function qrSvg(string $content, int $size, int $x, int $y, string $accent, string $textColor): string
    {
        try {
            $renderer = new ImageRenderer(
                new RendererStyle($size, 1),
                new SvgImageBackEnd()
            );

            $qr = (new Writer($renderer))->writeString($content);
            $qr = preg_replace('/^<\?xml[^>]*\?>\s*/', '', $qr) ?? $qr;
            $qr = preg_replace('/<!DOCTYPE[^>]*>\s*/', '', $qr) ?? $qr;
            $qr = preg_replace('/<svg\b/', sprintf('<svg x="%d" y="%d"', $x, $y), $qr, 1) ?? $qr;

            return $qr;
        } catch (Throwable $exception) {
            Log::warning('E-card QR generation failed.', [
                'guest_token' => $content,
                'error' => $exception->getMessage(),
            ]);

            return $this->qrPlaceholder($x, $y, $size, $accent, $textColor);
        }
    }

    private function qrPlaceholder(int $x, int $y, int $size, string $accent, string $textColor): string
    {
        $inner = $size - 24;

        return '<g fill="none" stroke="'.$textColor.'" stroke-width="2" opacity="0.75">'
            .sprintf('<rect x="%d" y="%d" width="%d" height="%d"/>', $x + 12, $y + 12, $inner, $inner)
            .sprintf('<rect x="%d" y="%d" width="26" height="26" fill="%s"/>', $x + 20, $y + 20, $accent)
            .sprintf('<rect x="%d" y="%d" width="26" height="26" fill="%s"/>', $x + $size - 46, $y + 20, $accent)
            .sprintf('<rect x="%d" y="%d" width="26" height="26" fill="%s"/>', $x + 20, $y + $size - 46, $accent)
            .'</g>'
            .$this->text($x + ($size / 2), $y + ($size / 2) + 4, 'PASS', $textColor, 9, '700', 'middle', 2);
    }

    private function text(
        int|float $x,
        int|float $y,
        string $value,
        string $fill,
        int|float $size,
        string $weight = '400',
        string $anchor = 'middle',
        int|float $letterSpacing = 0,
        float $opacity = 1.0,
        string $family = self::SANS
    ): string {
        return sprintf(
            '<text x="%s" y="%s" fill="%s" fill-opacity="%s" font-size="%s" font-weight="%s" font-family="%s" text-anchor="%s"%s>%s</text>',
            $this->num($x),
            $this->num($y),
            $fill,
            $this->num($opacity),
            $this->num($size),
            $weight,
            $family,
            $anchor,
            abs($letterSpacing) > 0.0001 ? ' letter-spacing="'.$this->num($letterSpacing).'"' : '',
            $this->escape($value)
        );
    }

    /**
     * Mirror CSS text-balance for short headings: prefer the two-line split whose
     * halves are closest in length instead of filling the first line greedily.
     *
     * @return list<string>
     */
    private function headline(string $value, int $charactersPerLine, int $maxLines): array
    {
        $words = preg_split('/\s+/u', trim($value)) ?: [];

        if (count($words) > 1 && mb_strlen(implode(' ', $words)) > $charactersPerLine) {
            $best = null;
            $bestScore = null;

            for ($split = 1; $split < count($words); $split++) {
                $first = implode(' ', array_slice($words, 0, $split));
                $second = implode(' ', array_slice($words, $split));

                if (mb_strlen($first) > $charactersPerLine || mb_strlen($second) > $charactersPerLine) {
                    continue;
                }

                $score = abs(mb_strlen($first) - mb_strlen($second));
                if ($bestScore === null || $score < $bestScore) {
                    $bestScore = $score;
                    $best = [$first, $second];
                }
            }

            if ($best !== null) {
                return $best;
            }
        }

        return $this->wrap($value, $charactersPerLine, $maxLines);
    }

    /**
     * @return array<int, string>
     */
    private function wrap(string $value, int $charactersPerLine, int $maxLines): array
    {
        $words = preg_split('/\s+/u', trim($value)) ?: [];
        $lines = [];
        $current = '';

        foreach ($words as $word) {
            $candidate = $current === '' ? $word : $current.' '.$word;

            if (mb_strlen($candidate) <= $charactersPerLine) {
                $current = $candidate;
                continue;
            }

            if ($current !== '') {
                $lines[] = $current;
            }

            $current = $word;
        }

        if ($current !== '') {
            $lines[] = $current;
        }

        if ($lines === []) {
            return [''];
        }

        if (count($lines) > $maxLines) {
            $lines = array_slice($lines, 0, $maxLines);
            $lastIndex = $maxLines - 1;
            $lines[$lastIndex] = rtrim(mb_substr($lines[$lastIndex], 0, max(1, $charactersPerLine - 1))).'…';
        }

        return $lines;
    }

    private function initials(string $name): string
    {
        $parts = array_values(array_filter(preg_split('/\s+/u', trim($name)) ?: [], static fn (string $part): bool => $part !== ''));

        $letters = '';
        foreach (array_slice($parts, 0, 2) as $part) {
            $letters .= mb_substr($part, 0, 1);
        }

        return $letters === '' ? 'G' : mb_strtoupper($letters);
    }

    private static function sanitizeHex(?string $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        return preg_match('/^#[0-9A-Fa-f]{6}$/', $value) === 1 ? strtoupper($value) : null;
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }

    private function num(float|int $value): string
    {
        return rtrim(rtrim(number_format((float) $value, 2, '.', ''), '0'), '.');
    }
}
