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
        Schema::table('users', function (Blueprint $table) {
            $table->string('agent_codename')->nullable()->after('name');
            $table->string('clearance_level')->nullable()->default('LEVEL-1')->after('agent_codename');
            $table->string('department')->nullable()->after('clearance_level');
            $table->string('rank')->nullable()->after('department');
            $table->date('assigned_since')->nullable()->after('rank');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['agent_codename', 'clearance_level', 'department', 'rank', 'assigned_since']);
        });
    }
};
