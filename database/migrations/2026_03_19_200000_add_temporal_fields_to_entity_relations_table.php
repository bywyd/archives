<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('entity_relations', function (Blueprint $table) {
            $table->string('fictional_start')->nullable()->after('context');
            $table->string('fictional_end')->nullable()->after('fictional_start');
            $table->string('status')->nullable()->after('fictional_end'); // active, ended, dormant, severed
        });
    }

    public function down(): void
    {
        Schema::table('entity_relations', function (Blueprint $table) {
            $table->dropColumn(['fictional_start', 'fictional_end', 'status']);
        });
    }
};
