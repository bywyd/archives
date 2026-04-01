<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_power_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_id')->constrained()->onDelete('cascade');
            $table->foreignId('source_entity_id')->nullable()->constrained('entities')->onDelete('set null');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('source')->nullable();           // natural, T-Virus, Prototype Virus, NE-α parasite, training, genetic
            $table->string('category')->nullable();          // combat, physical, mental, supernatural, medical, sensory
            $table->string('power_level')->nullable();       // low, moderate, high, extreme, immeasurable
            $table->string('status')->default('active');     // active, lost, dormant, sealed, evolved
            $table->string('fictional_date_acquired')->nullable();
            $table->string('fictional_date_lost')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['entity_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_power_profiles');
    }
};
