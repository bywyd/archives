<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('timeline_events', function (Blueprint $table) {
            $table->string('event_type')->nullable()->after('description'); // combat, discovery, incident, political, medical, scientific, catastrophic
            $table->string('severity')->nullable()->after('event_type');    // minor, moderate, major, catastrophic
            $table->foreignId('location_entity_id')->nullable()->after('entity_id')
                  ->constrained('entities')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('timeline_events', function (Blueprint $table) {
            $table->dropForeign(['location_entity_id']);
            $table->dropColumn(['event_type', 'severity', 'location_entity_id']);
        });
    }
};
