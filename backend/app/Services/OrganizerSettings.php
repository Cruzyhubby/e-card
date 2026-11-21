<?php

namespace App\Services;

use App\Models\OrganizerSetting;
use App\Models\User;

class OrganizerSettings
{
    /**
     * Preferences an organizer controls for their own workspace. System-wide
     * delivery credentials stay in PlatformSettings and are admin-only.
     *
     * @var array<string, array{group: string, label: string, type: string, options?: list<string>, default: string, hint?: string}>
     */
    public const DEFINITIONS = [
        'guests.default_card_type' => [
            'group' => 'Guest list',
            'label' => 'Default card type',
            'type' => 'select',
            'options' => ['single', 'double', 'group', 'vip'],
            'default' => 'single',
        ],
        'guests.default_group_size' => [
            'group' => 'Guest list',
            'label' => 'Default group size',
            'type' => 'number',
            'default' => '4',
            'hint' => 'Attendee allowance used when a guest is added as a group card.',
        ],
        'tables.default_capacity' => [
            'group' => 'Tables',
            'label' => 'Default table capacity',
            'type' => 'number',
            'default' => '10',
        ],
        'tables.flag_over_capacity' => [
            'group' => 'Tables',
            'label' => 'Flag over-capacity tables',
            'type' => 'boolean',
            'default' => '1',
            'hint' => 'When on, seating beyond a table capacity is highlighted in reports.',
        ],
        'messaging.default_channel' => [
            'group' => 'Invitations',
            'label' => 'Default send channel',
            'type' => 'select',
            'options' => ['whatsapp', 'sms', 'email'],
            'default' => 'whatsapp',
        ],
        'calling.follow_up_days' => [
            'group' => 'Calling',
            'label' => 'Default follow-up interval (days)',
            'type' => 'number',
            'default' => '2',
        ],
        'calling.auto_assign' => [
            'group' => 'Calling',
            'label' => 'Auto-allocate new guests',
            'type' => 'boolean',
            'default' => '1',
            'hint' => 'New confirmed-pending guests are shared equally among calling participants.',
        ],
    ];

    /**
     * @return array{values: array<string, string>, groups: list<array{name: string, fields: list<array<string, mixed>>}>}
     */
    public function forApi(User $user): array
    {
        $stored = $this->stored($user);
        $groups = [];

        foreach (self::DEFINITIONS as $key => $definition) {
            $group = $definition['group'];

            if (! isset($groups[$group])) {
                $groups[$group] = ['name' => $group, 'fields' => []];
            }

            $groups[$group]['fields'][] = [
                'key' => $key,
                'label' => $definition['label'],
                'type' => $definition['type'],
                'options' => $definition['options'] ?? null,
                'hint' => $definition['hint'] ?? null,
                'default' => $definition['default'],
                'value' => $stored[$key] ?? $definition['default'],
                'source' => array_key_exists($key, $stored) ? 'database' : 'default',
            ];
        }

        return ['values' => $this->resolve($stored), 'groups' => array_values($groups)];
    }

    /**
     * @return array<string, string>
     */
    public function values(User $user): array
    {
        return $this->resolve($this->stored($user));
    }

    public function get(User $user, string $key): string
    {
        return $this->values($user)[$key] ?? (string) (self::DEFINITIONS[$key]['default'] ?? '');
    }

    public function int(User $user, string $key): int
    {
        return max(0, (int) $this->get($user, $key));
    }

    public function bool(User $user, string $key): bool
    {
        return $this->get($user, $key) === '1';
    }

    /**
     * @param  array<string, mixed>  $changes
     * @return list<string>
     */
    public function update(User $user, array $changes): array
    {
        $stored = $this->stored($user);
        $updated = [];

        foreach ($changes as $key => $value) {
            if (! array_key_exists($key, self::DEFINITIONS)) {
                continue;
            }

            $normalised = $this->normalise($key, $value);

            if ($normalised === null) {
                unset($stored[$key]);
            } else {
                $stored[$key] = $normalised;
            }

            $updated[] = $key;
        }

        OrganizerSetting::query()->updateOrCreate(
            ['user_id' => $user->id],
            ['settings' => $stored]
        );

        return $updated;
    }

    /**
     * @return array<string, string>
     */
    private function stored(User $user): array
    {
        $settings = OrganizerSetting::query()->find($user->id)?->settings;

        if (! is_array($settings)) {
            return [];
        }

        return array_map(
            static fn (mixed $value): string => is_scalar($value) ? (string) $value : '',
            array_filter($settings, fn (string $key): bool => array_key_exists($key, self::DEFINITIONS), ARRAY_FILTER_USE_KEY)
        );
    }

    /**
     * @param  array<string, string>  $stored
     * @return array<string, string>
     */
    private function resolve(array $stored): array
    {
        $values = [];

        foreach (self::DEFINITIONS as $key => $definition) {
            $values[$key] = $stored[$key] ?? (string) $definition['default'];
        }

        return $values;
    }

    private function normalise(string $key, mixed $value): ?string
    {
        $definition = self::DEFINITIONS[$key];
        $type = $definition['type'];

        if ($value === null || $value === '') {
            return null;
        }

        if ($type === 'boolean') {
            return filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) === true ? '1' : '0';
        }

        if ($type === 'number') {
            $number = (int) $value;

            return (string) max(0, min(999, $number));
        }

        if ($type === 'select') {
            $option = (string) $value;

            return in_array($option, $definition['options'] ?? [], true)
                ? $option
                : (string) $definition['default'];
        }

        return (string) $value;
    }
}
