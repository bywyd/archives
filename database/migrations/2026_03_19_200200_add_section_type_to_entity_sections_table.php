<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('entity_sections', function (Blueprint $table) {
            $table->string('section_type')->default('narrative')->after('slug'); // narrative, data, classified, gallery, quote, timeline
        });
    }

    public function down(): void
    {
        Schema::table('entity_sections', function (Blueprint $table) {
            $table->dropColumn('section_type');
        });
    }
};
