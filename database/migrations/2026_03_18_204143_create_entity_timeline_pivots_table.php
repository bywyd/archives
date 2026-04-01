<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('entity_timeline_pivots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_id')->constrained()->onDelete('cascade');
            $table->foreignId('timeline_id')->constrained()->onDelete('cascade');
            $table->string('role')->nullable();
            $table->text('notes')->nullable();
            $table->string('fictional_start')->nullable();
            $table->string('fictional_end')->nullable();
            $table->timestamps();

            $table->unique(['entity_id', 'timeline_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('entity_timeline_pivots');
    }
};
