<?php

namespace App\Policies;

use App\Models\Event;
use App\Models\User;

class EventPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isOrganizer() || $user->isUsher();
    }

    public function view(User $user, Event $event): bool
    {
        if ($user->isOrganizer()) {
            return (int) $event->user_id === (int) $user->id;
        }

        return $user->hasEventScope((int) $event->id);
    }

    public function create(User $user): bool
    {
        return $user->isOrganizer();
    }

    public function update(User $user, Event $event): bool
    {
        return $user->isOrganizer() && (int) $event->user_id === (int) $user->id;
    }

    public function delete(User $user, Event $event): bool
    {
        return $this->update($user, $event);
    }

    /**
     * Guest directories and personal data are strictly organizer-owned. Ushers
     * only validate passes; super admins never access organizer guest data.
     */
    public function manageGuests(User $user, Event $event): bool
    {
        return $this->update($user, $event);
    }

    public function manageTeam(User $user, Event $event): bool
    {
        return $this->update($user, $event);
    }
}
