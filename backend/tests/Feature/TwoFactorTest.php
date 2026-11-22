<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TwoFactorTest extends TestCase
{
    use RefreshDatabase;

    private User $organizer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->organizer = User::create([
            'name' => 'Test Organizer',
            'email' => 'twofactor@example.com',
            'password' => 'secret1234',
            'role' => 'organizer',
            'status' => 'active',
            'must_change_password' => false,
        ]);
    }

    public function test_organizer_can_enroll_and_sign_in_with_authenticator_or_recovery_codes(): void
    {
        Sanctum::actingAs($this->organizer);

        $this->getJson('/api/auth/two-factor')
            ->assertOk()
            ->assertJsonPath('enabled', false);

        $setup = $this->postJson('/api/auth/two-factor/setup', ['password' => 'secret1234'])
            ->assertOk()
            ->assertJsonStructure(['secret', 'secret_raw', 'otpauth_uri', 'qr_data_uri']);

        $secret = $setup->json('secret_raw');
        $this->assertSame(32, strlen($secret));
        $this->assertStringStartsWith('otpauth://totp/', $setup->json('otpauth_uri'));
        $this->assertStringStartsWith('data:image/svg+xml;base64,', $setup->json('qr_data_uri'));

        $currentCode = $this->codeFor($secret);
        $confirmed = $this->postJson('/api/auth/two-factor/confirm', ['code' => $currentCode])
            ->assertOk()
            ->assertJsonPath('enabled', true);

        $recoveryCodes = $confirmed->json('recovery_codes');
        $this->assertCount(8, $recoveryCodes);

        $this->clearLoginLimit();
        $this->postJson('/api/auth/login', $this->credentials())
            ->assertStatus(422)
            ->assertJsonPath('code', 'two_factor_required');

        $this->clearLoginLimit();
        $this->postJson('/api/auth/login', $this->credentials(['two_factor_code' => $currentCode]))
            ->assertStatus(422)
            ->assertJsonPath('code', 'two_factor_invalid');

        $this->clearLoginLimit();
        $freshCode = $this->codeFor($secret, $this->counter() + 1);
        $this->postJson('/api/auth/login', $this->credentials(['two_factor_code' => $freshCode]))
            ->assertOk()
            ->assertJsonPath('user.two_factor_enabled', true);

        $this->clearLoginLimit();
        $this->postJson('/api/auth/login', $this->credentials(['two_factor_code' => $recoveryCodes[0]]))
            ->assertOk();

        $this->clearLoginLimit();
        $this->postJson('/api/auth/login', $this->credentials(['two_factor_code' => $recoveryCodes[0]]))
            ->assertStatus(422)
            ->assertJsonPath('code', 'two_factor_invalid');

        $this->organizer->refresh();
        Sanctum::actingAs($this->organizer);

        $this->getJson('/api/auth/two-factor')
            ->assertOk()
            ->assertJsonPath('enabled', true)
            ->assertJsonPath('recovery_codes_left', 7);

        $this->deleteJson('/api/auth/two-factor', [
            'password' => 'secret1234',
            'code' => $recoveryCodes[1],
        ])->assertOk()->assertJsonPath('enabled', false);
    }

    public function test_setup_requires_the_current_password(): void
    {
        Sanctum::actingAs($this->organizer);

        $this->postJson('/api/auth/two-factor/setup', ['password' => 'wrong-password'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');
    }

    public function test_usher_accounts_cannot_use_two_factor_endpoints(): void
    {
        $usher = User::create([
            'name' => 'Gate One',
            'email' => 'gate-one@example.com',
            'password' => 'secret1234',
            'role' => 'usher',
            'status' => 'active',
            'must_change_password' => false,
        ]);

        Sanctum::actingAs($usher);

        $this->getJson('/api/auth/two-factor')->assertForbidden();
        $this->postJson('/api/auth/two-factor/setup', ['password' => 'secret1234'])->assertForbidden();
    }

    /**
     * @param  array<string, string>  $extra
     * @return array<string, string>
     */
    private function credentials(array $extra = []): array
    {
        return array_merge([
            'email' => $this->organizer->email,
            'password' => 'secret1234',
        ], $extra);
    }

    private function clearLoginLimit(): void
    {
        RateLimiter::clear($this->organizer->email.'|127.0.0.1');
        RateLimiter::clear('127.0.0.1');
    }

    private function counter(): int
    {
        return intdiv(time(), 30);
    }

    private function codeFor(string $secret, ?int $counter = null): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $clean = strtoupper(preg_replace('/[^A-Z2-7]/', '', $secret) ?? '');
        $bits = '';

        foreach (str_split($clean) as $character) {
            $bits .= str_pad(decbin(strpos($alphabet, $character)), 5, '0', STR_PAD_LEFT);
        }

        $key = '';

        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) === 8) {
                $key .= chr(bindec($byte));
            }
        }

        $hash = hash_hmac('sha1', pack('J', $counter ?? $this->counter()), $key, true);
        $offset = ord($hash[19]) & 0x0F;
        $value = ((ord($hash[$offset]) & 0x7F) << 24)
            | ((ord($hash[$offset + 1]) & 0xFF) << 16)
            | ((ord($hash[$offset + 2]) & 0xFF) << 8)
            | (ord($hash[$offset + 3]) & 0xFF);

        return str_pad((string) ($value % 1000000), 6, '0', STR_PAD_LEFT);
    }
}
