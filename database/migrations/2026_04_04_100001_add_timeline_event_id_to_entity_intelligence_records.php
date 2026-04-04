<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('entity_intelligence_records', function (Blueprint $table) {
            $table->foreignId('timeline_event_id')->nullable()->after('subject_entity_id')
                  ->constrained('timeline_events')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('entity_intelligence_records', function (Blueprint $table) {
            $table->dropForeign(['timeline_event_id']);
            $table->dropColumn('timeline_event_id');
        });
    }
};
