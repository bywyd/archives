<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_transmission_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transmission_entity_id')->constrained('entities', 'id')->cascadeOnDelete();
            $table->foreignId('speaker_entity_id')->nullable()->constrained('entities', 'id')->nullOnDelete();
            $table->string('speaker_label')->nullable();  // Fallback label when speaker has no entity (e.g. "Unknown Voice", "Static")
            $table->text('content');                       // The actual spoken/written line
            $table->string('content_type')->default('dialogue'); // dialogue, narration, action, static, system, redacted
            $table->string('tone')->nullable();            // calm, urgent, panicked, whispered, screaming, cold, sarcastic
            $table->string('fictional_timestamp')->nullable(); // In-universe time of this line
            $table->boolean('is_redacted')->default(false);
            $table->text('redacted_reason')->nullable();   // Why this line is censored/redacted
            $table->text('notes')->nullable();             // Editorial notes, translation notes
            $table->integer('sort_order')->default(0);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['transmission_entity_id', 'sort_order'], 'transmission_order_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_transmission_records');
    }
};
