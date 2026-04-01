<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('timeline_event_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('timeline_event_id')->constrained()->onDelete('cascade');
            $table->foreignId('entity_id')->constrained()->onDelete('cascade');
            $table->string('role')->nullable();     // combatant, victim, observer, instigator, survivor, target
            $table->string('outcome')->nullable();   // survived, killed, infected, mutated, escaped, captured, missing
            $table->text('notes')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['timeline_event_id', 'entity_id']);
            $table->index('entity_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('timeline_event_participants');
    }
};
