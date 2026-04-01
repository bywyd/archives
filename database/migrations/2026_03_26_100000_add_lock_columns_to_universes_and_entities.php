<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('universes', function (Blueprint $table) {
            $table->boolean('is_locked')->default(false)->after('settings');
        });

        Schema::table('entities', function (Blueprint $table) {
            $table->boolean('is_locked')->default(false)->after('is_featured');
        });
    }

    public function down(): void
    {
        Schema::table('universes', function (Blueprint $table) {
            $table->dropColumn('is_locked');
        });

        Schema::table('entities', function (Blueprint $table) {
            $table->dropColumn('is_locked');
        });
    }
};
