<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_affiliation_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_id')->constrained()->onDelete('cascade');
            $table->foreignId('organization_entity_id')->nullable()->constrained('entities')->onDelete('set null');
            $table->string('organization_name');
            $table->string('role')->nullable();
            $table->string('rank')->nullable();
            $table->string('fictional_start')->nullable();
            $table->string('fictional_end')->nullable();
            $table->string('status')->default('active');       // active, former, defected, expelled, undercover, deceased
            $table->text('notes')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['entity_id', 'status']);
            $table->index('organization_entity_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_affiliation_history');
    }
};
