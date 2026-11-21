<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CreateAdminCommand extends Command
{
    protected $signature = 'eclat:create-admin
        {--name= : Display name}
        {--email= : E-mail address}
        {--password= : Password (omitted = generate a secure one)}';

    protected $description = 'Create or update an Éclat super admin (platform owner) account.';

    public function handle(): int
    {
        $name = $this->option('name') ?: $this->ask('Name', 'Éclat Admin');
        $email = Str::lower(trim((string) ($this->option('email') ?: $this->ask('E-mail address'))));

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Please provide a valid e-mail address.');

            return self::FAILURE;
        }

        $password = $this->option('password');
        $generated = false;

        if (! $password) {
            $password = Str::password(16);
            $generated = true;
        }

        if (strlen($password) < 8) {
            $this->error('The password must be at least 8 characters.');

            return self::FAILURE;
        }

        $user = User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make($password),
                'role' => 'super_admin',
                'status' => 'active',
            ]
        );

        $this->info(($user->wasRecentlyCreated ? 'Created' : 'Updated')." super admin: {$user->email}");

        if ($generated) {
            $this->warn("Generated password: {$password}");
            $this->warn('Store it now — it will not be shown again.');
        }

        return self::SUCCESS;
    }
}
