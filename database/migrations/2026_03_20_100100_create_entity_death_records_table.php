<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_death_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_id')->constrained('entities')->cascadeOnDelete();
            $table->foreignId('killer_entity_id')->nullable()->constrained('entities')->nullOnDelete();
            $table->foreignId('incident_entity_id')->nullable()->constrained('entities')->nullOnDelete();
            $table->foreignId('location_entity_id')->nullable()->constrained('entities')->nullOnDelete();
            $table->string('death_type');                           // killed, sacrificed, executed, suicide, accidental, presumed, mutation-death, disintegrated
            $table->string('fictional_date')->nullable();
            $table->text('cause_of_death')->nullable();
            $table->text('circumstances')->nullable();              // the full narrative
            $table->boolean('is_confirmed')->default(true);
            $table->boolean('is_revived')->default(false);
            $table->string('revival_method')->nullable();           // resurrection, viral-reanimation, consciousness-transfer, cloning, megamycete, flask-reassembly
            $table->string('fictional_date_revived')->nullable();
            $table->text('revival_circumstances')->nullable();
            $table->foreignId('revived_by_entity_id')->nullable()->constrained('entities')->nullOnDelete();
            $table->json('body_modifications')->nullable();         // what changed after death/revival
            $table->json('metadata')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['entity_id', 'is_revived']);
            $table->index('killer_entity_id');
            $table->index('incident_entity_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_death_records');
    }
};
