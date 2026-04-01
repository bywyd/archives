<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('entity_map_floors', function (Blueprint $table) {
            $table->foreignId('entity_id')->nullable()->after('entity_map_id')
                ->constrained('entities')->cascadeOnDelete();
            $table->index('entity_id');
        });
    }

    public function down(): void
    {
        Schema::table('entity_map_floors', function (Blueprint $table) {
            $table->dropForeign(['entity_id']);
            $table->dropIndex(['entity_id']);
            $table->dropColumn('entity_id');
        });
    }
};
