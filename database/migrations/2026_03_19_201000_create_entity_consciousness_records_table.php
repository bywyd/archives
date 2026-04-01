<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_consciousness_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_id')->constrained()->onDelete('cascade');                          // the consciousness owner
            $table->foreignId('vessel_entity_id')->nullable()->constrained('entities')->onDelete('set null'); // the body/host
            $table->string('status');                           // active, transferred, dormant, fragmented, merged, destroyed, digital, shared
            $table->string('transfer_method')->nullable();      // ritual, technology, parasitic, viral, psychic, forced, voluntary
            $table->string('vessel_status')->nullable();        // original, new, cloned, synthetic, decaying, deceased, overwritten
            $table->string('fictional_date_start')->nullable(); // when this state began
            $table->string('fictional_date_end')->nullable();   // when this state ended
            $table->text('description')->nullable();            // detailed narrative of the state/transfer
            $table->text('notes')->nullable();                  // additional notes
            $table->json('side_effects')->nullable();           // effects on the vessel or consciousness
            $table->json('metadata')->nullable();               // flexible extra data
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['entity_id', 'status']);
            $table->index('vessel_entity_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_consciousness_records');
    }
};
