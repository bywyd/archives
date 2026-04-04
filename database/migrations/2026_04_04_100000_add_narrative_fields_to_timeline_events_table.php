<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('timeline_events', function (Blueprint $table) {
            $table->text('narrative')->nullable()->after('description');
            $table->string('phase')->nullable()->after('severity');
            $table->string('duration')->nullable()->after('phase');
        });
    }

    public function down(): void
    {
        Schema::table('timeline_events', function (Blueprint $table) {
            $table->dropColumn(['narrative', 'phase', 'duration']);
        });
    }
};
