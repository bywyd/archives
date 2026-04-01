<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_mutation_stages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_id')->constrained()->onDelete('cascade');
            $table->foreignId('trigger_entity_id')->nullable()->constrained('entities')->onDelete('set null');
            $table->integer('stage_number');
            $table->string('name');
            $table->string('trigger')->nullable();           // self-injection, viral progression, NE-α activation, combat damage
            $table->text('description')->nullable();
            $table->json('physical_changes')->nullable();
            $table->json('abilities_gained')->nullable();
            $table->json('abilities_lost')->nullable();
            $table->string('threat_level')->nullable();
            $table->boolean('is_reversible')->default(false);
            $table->string('fictional_date')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['entity_id', 'stage_number']);
            $table->index('entity_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_mutation_stages');
    }
};
