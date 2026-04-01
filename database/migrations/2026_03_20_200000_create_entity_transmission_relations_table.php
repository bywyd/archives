<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_transmission_relations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transmission_entity_id')->constrained('entities')->cascadeOnDelete();
            $table->foreignId('participant_entity_id')->constrained('entities')->cascadeOnDelete();
            $table->string('role')->default('speaker'); // speaker, listener, interceptor, location, mentioned, moderator
            $table->string('callsign')->nullable();     // Radio callsign / handle used during transmission
            $table->string('channel')->nullable();       // Radio frequency, codec channel, comms line
            $table->boolean('is_present')->default(true); // Whether physically present vs remote
            $table->integer('sort_order')->default(0);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['transmission_entity_id', 'participant_entity_id', 'role'], 'transmission_participant_role_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_transmission_relations');
    }
};
