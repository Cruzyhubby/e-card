<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Models\User;

class PlatformSettings
{
    /**
     * Central registry of settings editable by the super admin. Values are stored
     * encrypted at rest; secret fields are write-only from the API.
     *
     * @var array<string, array{group: string, label: string, type: string, secret?: bool, options?: list<string>, default: string, hint?: string}>
     */
    public const DEFINITIONS = [
        'messaging.driver' => [
            'group' => 'Delivery',
            'label' => 'Delivery mode',
            'type' => 'select',
            'options' => ['log', 'live'],
            'default' => 'log',
            'hint' => 'Log records messages without contacting providers. Live sends through the selected WhatsApp and SMS providers, plus SMTP.',
        ],
        'whatsapp.provider' => [
            'group' => 'WhatsApp gateway',
            'label' => 'WhatsApp provider',
            'type' => 'select',
            'options' => ['meta'],
            'default' => 'meta',
            'hint' => 'Meta sends free-form Cloud API messages. Set the phone number ID and token below.',
        ],
        'whatsapp.api_version' => [
            'group' => 'Meta Cloud API',
            'label' => 'Graph API version',
            'type' => 'text',
            'default' => 'v21.0',
        ],
        'whatsapp.phone_number_id' => [
            'group' => 'Meta Cloud API',
            'label' => 'Phone number ID',
            'type' => 'text',
            'default' => '',
        ],
        'whatsapp.token' => [
            'group' => 'Meta Cloud API',
            'label' => 'Cloud API access token',
            'type' => 'password',
            'secret' => true,
            'default' => '',
        ],
        'sms.provider' => [
            'group' => 'SMS gateway',
            'label' => 'SMS provider',
            'type' => 'select',
            'options' => ['log', 'kilakona'],
            'default' => 'log',
            'hint' => 'Log records SMS without contacting a gateway. Kilakona sends through its live API.',
        ],
        'sms.sender_id' => [
            'group' => 'SMS gateway',
            'label' => 'Sender ID',
            'type' => 'text',
            'default' => '',
            'hint' => 'The sender ID approved by your SMS provider. It must match exactly, including capital letters.',
        ],
        'sms.country_code' => [
            'group' => 'SMS gateway',
            'label' => 'Default country code',
            'type' => 'text',
            'default' => '255',
            'hint' => 'Used to normalise local numbers such as 0712 345 678.',
        ],
        'sms.base_url' => [
            'group' => 'Kilakona SMS',
            'label' => 'API base URL',
            'type' => 'text',
            'default' => 'https://messaging.kilakona.co.tz',
        ],
        'sms.send_path' => [
            'group' => 'Kilakona SMS',
            'label' => 'Send endpoint path',
            'type' => 'text',
            'default' => '/api/v1/vendor/message/send',
        ],
        'sms.api_key' => [
            'group' => 'Kilakona SMS',
            'label' => 'API key',
            'type' => 'password',
            'secret' => true,
            'default' => '',
            'hint' => 'Sent as the api_key header on every Kilakona request.',
        ],
        'sms.api_secret' => [
            'group' => 'Kilakona SMS',
            'label' => 'API secret',
            'type' => 'password',
            'secret' => true,
            'default' => '',
            'hint' => 'Sent as the api_secret header. Both the key and secret are required.',
        ],
        'mail.host' => [
            'group' => 'Email SMTP',
            'label' => 'SMTP host',
            'type' => 'text',
            'default' => '',
        ],
        'mail.port' => [
            'group' => 'Email SMTP',
            'label' => 'SMTP port',
            'type' => 'text',
            'default' => '587',
        ],
        'mail.username' => [
            'group' => 'Email SMTP',
            'label' => 'SMTP username',
            'type' => 'text',
            'default' => '',
        ],
        'mail.password' => [
            'group' => 'Email SMTP',
            'label' => 'SMTP password',
            'type' => 'password',
            'secret' => true,
            'default' => '',
        ],
        'mail.encryption' => [
            'group' => 'Email SMTP',
            'label' => 'Encryption',
            'type' => 'select',
            'options' => ['tls', 'ssl', 'none'],
            'default' => 'tls',
        ],
        'mail.from_address' => [
            'group' => 'Email SMTP',
            'label' => 'From address',
            'type' => 'text',
            'default' => '',
        ],
        'mail.from_name' => [
            'group' => 'Email SMTP',
            'label' => 'From name',
            'type' => 'text',
            'default' => 'Fahari Creative',
        ],
    ];

    /**
     * @var array<string, string>|null
     */
    private ?array $values = null;

    /**
     * @return array<string, string>
     */
    public function all(): array
    {
        if ($this->values !== null) {
            return $this->values;
        }

        return $this->values = AppSetting::query()
            ->get()
            ->mapWithKeys(fn (AppSetting $setting): array => [
                $setting->key => (string) ($setting->value ?? ''),
            ])
            ->all();
    }

    public function get(string $key, string|int|null $default = null): string|int|null
    {
        $values = $this->all();

        if (array_key_exists($key, $values) && $values[$key] !== '') {
            return $values[$key];
        }

        return self::DEFINITIONS[$key]['default'] ?? $default;
    }

    public function has(string $key): bool
    {
        $values = $this->all();

        return array_key_exists($key, $values) && $values[$key] !== '';
    }

    public function isSecret(string $key): bool
    {
        return (bool) (self::DEFINITIONS[$key]['secret'] ?? false);
    }

    /**
     * API-safe representation: secrets never leave the server.
     *
     * @return array{groups: list<array{name: string, fields: list<array<string, mixed>>}>}
     */
    public function forApi(): array
    {
        $values = $this->all();
        $groups = [];

        foreach (self::DEFINITIONS as $key => $definition) {
            $stored = $values[$key] ?? null;
            $secret = (bool) ($definition['secret'] ?? false);

            $group = $definition['group'];

            if (! isset($groups[$group])) {
                $groups[$group] = ['name' => $group, 'fields' => []];
            }

            $groups[$group]['fields'][] = [
                'key' => $key,
                'label' => $definition['label'],
                'type' => $definition['type'],
                'secret' => $secret,
                'options' => $definition['options'] ?? null,
                'hint' => $definition['hint'] ?? null,
                'default' => $secret ? null : $definition['default'],
                'value' => $secret ? null : ($stored ?? $definition['default']),
                'has_value' => $stored !== null && $stored !== '',
                'source' => $stored !== null ? 'database' : 'default',
            ];
        }

        return ['groups' => array_values($groups)];
    }

    /**
     * @param  array<string, mixed>  $changes
     * @return list<string>
     */
    public function update(array $changes, ?User $actor = null): array
    {
        $updated = [];

        foreach ($changes as $key => $value) {
            if (! array_key_exists($key, self::DEFINITIONS)) {
                continue;
            }

            $secret = $this->isSecret($key);

            // Blank secret inputs mean "leave unchanged"; null explicitly clears.
            if ($secret && $value === '') {
                continue;
            }

            if ($value === null || ($value === '' && ! $secret)) {
                AppSetting::query()->whereKey($key)->delete();
                $updated[] = $key;
                continue;
            }

            AppSetting::query()->updateOrCreate(
                ['key' => $key],
                [
                    'value' => (string) $value,
                    'is_secret' => $secret,
                    'updated_by' => $actor?->id,
                ]
            );

            $updated[] = $key;
        }

        $this->values = null;

        return $updated;
    }

    public function clearCache(): void
    {
        $this->values = null;
    }
}
