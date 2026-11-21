<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Invitation domain
    |--------------------------------------------------------------------------
    */

    'categories' => [
        'wedding',
        'engagement',
        'birthday',
        'graduation',
        'conference',
        'gala',
        'kitchen-party',
        'send-off',
        'seminar',
        'other',
    ],

    'guest_statuses' => [
        'pending',
        'sent',
        'checked_in',
        'cancelled',
    ],

    'invitation_statuses' => [
        'draft',
        'live',
    ],

    /*
    |--------------------------------------------------------------------------
    | Invitation cards
    |--------------------------------------------------------------------------
    |
    | Card type sets the attendee allowance for a guest. "group" seats are
    | defined per guest; single/double/vip are fixed so the allowance cannot
    | drift between imports, edits and check-in.
    |
    */

    'card_types' => [
        'single',
        'double',
        'group',
        'vip',
    ],

    'card_type_labels' => [
        'single' => 'Single',
        'double' => 'Double (couple)',
        'group' => 'Group',
        'vip' => 'VIP',
    ],

    'card_type_attendees' => [
        'single' => 1,
        'double' => 2,
        'group' => null,
        'vip' => 1,
    ],

    'confirmation_statuses' => [
        'pending',
        'confirmed',
        'declined',
    ],

    'confirmation_sources' => [
        'manual',
        'import',
        'rsvp',
    ],

    'max_group_attendees' => 50,

    /*
    |--------------------------------------------------------------------------
    | E-card rendering
    |--------------------------------------------------------------------------
    */

    'ecard' => [
        'width' => 480,
        'height' => 680,
        'templates' => [
            'noir',
            'ivory',
            'emerald',
            'terracotta',
            'royal',
        ],
        'qr_positions' => [
            'bottom-left',
            'bottom-center',
            'bottom-right',
        ],
        'name_y_min' => 20,
        'name_y_max' => 80,
        'qr_size_min' => 88,
        'qr_size_max' => 180,
    ],

    /*
    |--------------------------------------------------------------------------
    | Messaging
    |--------------------------------------------------------------------------
    |
    | ECLAT_MESSAGING_DRIVER is "log" for local development (messages are
    | logged and marked sent) or "live" to use WhatsApp Cloud API / SMTP.
    |
    */

    'messaging_driver' => env('ECLAT_MESSAGING_DRIVER', 'log'),

    'message_templates' => [
        'whatsapp' => 'Hello {guest_name}! You are invited to {event_title}. Table: {table_number}. View your personal e-card and QR pass: {qr_link}',
        'sms' => 'Hello {guest_name}! You are invited to {event_title}. Table: {table_number}. E-card: {qr_link}',
        'email' => "Hi {guest_name}, you're invited to {event_title}. Your table is {table_number}. Here is your personal e-card with your QR entry pass: {qr_link}",
    ],

    // One SMS credit is limited to 160 characters; longer messages are split.
    'sms_segment_length' => 160,

    'unassigned_table_label' => 'TBA',

    /*
    |--------------------------------------------------------------------------
    | Calling operations
    |--------------------------------------------------------------------------
    |
    | Ushers and organizers share the calling workflow. Allocation is equal by
    | default; organizers can move guests between participants manually.
    |
    */

    'calling_outcomes' => [
        'confirmed',
        'not_confirmed',
        'no_answer',
        'busy',
        'phone_off',
        'wrong_number',
        'call_back_later',
    ],

    'calling_outcome_labels' => [
        'confirmed' => 'Confirmed',
        'not_confirmed' => 'Not confirmed',
        'no_answer' => 'No answer',
        'busy' => 'Busy',
        'phone_off' => 'Phone off',
        'wrong_number' => 'Wrong number',
        'call_back_later' => 'Call back later',
    ],

    // Outcomes that close an allocation without marking the guest confirmed.
    'calling_terminal_outcomes' => [
        'confirmed',
        'not_confirmed',
        'wrong_number',
    ],

    'calling_default_follow_up_days' => 2,

    'calling_activity_states' => [
        'usher_only',
        'usher_calling',
    ],

    /*
    |--------------------------------------------------------------------------
    | E-Card Studio
    |--------------------------------------------------------------------------
    */

    'design_formats' => [
        'svg',
        'png',
        'jpg',
    ],

    'design_statuses' => [
        'draft',
        'pending_approval',
        'approved',
        'rejected',
        'superseded',
    ],

    'design_max_upload_kb' => 5120,

    /*
    |--------------------------------------------------------------------------
    | Guest import
    |--------------------------------------------------------------------------
    */

    'import_max_rows' => 2000,
];
