<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_intelligence_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_id')->constrained('entities')->cascadeOnDelete();
            $table->foreignId('observer_entity_id')->constrained('entities')->cascadeOnDelete();
            $table->foreignId('subject_entity_id')->nullable()->constrained('entities')->nullOnDelete();
            $table->string('classification')->default('unknown');   // known, unknown, classified, redacted, partial, rumored, discovered
            $table->string('discovered_during')->nullable();        // event name / incident / game reference
            $table->string('fictional_date_learned')->nullable();   // when the observer learned this
            $table->string('fictional_date_declassified')->nullable();
            $table->text('intelligence_summary')->nullable();       // what the observer knows
            $table->text('redacted_details')->nullable();           // what they still don't know
            $table->string('source')->nullable();                   // how they learned it (document, witness, interrogation, etc.)
            $table->string('reliability')->nullable();              // confirmed, suspected, unverified, disinformation
            $table->json('metadata')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['entity_id', 'classification']);
            $table->index('observer_entity_id');
            $table->index('subject_entity_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_intelligence_records');
    }
};
