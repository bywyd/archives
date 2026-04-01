<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_infection_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_id')->constrained()->onDelete('cascade');
            $table->foreignId('pathogen_entity_id')->nullable()->constrained('entities')->onDelete('set null');
            $table->foreignId('cure_entity_id')->nullable()->constrained('entities')->onDelete('set null');
            $table->string('pathogen_name');
            $table->string('infection_method')->nullable();   // bite, injection, airborne, implantation, water, contact
            $table->string('cure_name')->nullable();
            $table->string('cure_method')->nullable();        // injection, compound, surgical, natural_immunity
            $table->string('fictional_date_infected')->nullable();
            $table->string('fictional_date_cured')->nullable();
            $table->string('status');                         // active, cured, dormant, lethal, immunity, unknown
            $table->string('severity')->nullable();           // mild, moderate, severe, critical, lethal
            $table->json('side_effects')->nullable();         // permanent changes post-cure
            $table->json('symptoms_exhibited')->nullable();   // which symptoms this particular host showed
            $table->text('notes')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['entity_id', 'status']);
            $table->index('pathogen_entity_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_infection_records');
    }
};
