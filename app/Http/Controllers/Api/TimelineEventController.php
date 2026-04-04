<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreTimelineEventRequest;
use App\Http\Resources\TimelineEventResource;
use App\Models\Timeline;
use App\Models\TimelineEvent;
use App\Models\Universe;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TimelineEventController extends Controller
{
    public function index(Request $request, Universe $universe, Timeline $timeline): AnonymousResourceCollection
    {
        $events = $timeline->events()
            ->with(['entity.entityType', 'location.entityType', 'participants.entity.entityType'])
            ->orderBy('sort_order')
            ->paginate($request->input('per_page', 50));

        return TimelineEventResource::collection($events);
    }

    public function store(StoreTimelineEventRequest $request, Universe $universe, Timeline $timeline): TimelineEventResource
    {
        $data = $request->validated();
        $data['timeline_id'] = $timeline->id;

        $event = TimelineEvent::create($data);
        $event->load('entity.entityType');

        return new TimelineEventResource($event);
    }

    public function show(Universe $universe, Timeline $timeline, TimelineEvent $event): TimelineEventResource
    {
        $event->load(['entity.entityType', 'location.entityType', 'participants.entity.entityType']);

        return new TimelineEventResource($event);
    }

    public function update(Request $request, Universe $universe, Timeline $timeline, TimelineEvent $event): TimelineEventResource
    {
        $validated = $request->validate([
            'entity_id' => ['nullable', 'exists:entities,id'],
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'fictional_date' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer'],
            'metadata' => ['nullable', 'array'],
        ]);

        $event->update($validated);
        $event->load('entity.entityType');

        return new TimelineEventResource($event);
    }

    public function destroy(Universe $universe, Timeline $timeline, TimelineEvent $event): \Illuminate\Http\JsonResponse
    {
        $event->delete();

        return response()->json(null, 204);
    }

    /**
     * Event Reconstruction  returns all events grouped by phase with full context.
     */
    public function reconstruction(Universe $universe, Timeline $timeline): \Illuminate\Http\JsonResponse
    {
        $timeline->load(['entities.entityType', 'images']);
        $timeline->loadCount(['entities', 'events']);

        $events = $timeline->events()
            ->with([
                'entity.entityType',
                'entity.images',
                'location.entityType',
                'participants.entity.entityType',
                'participants.entity.images',
                'intelligenceRecords.observer.entityType',
                'intelligenceRecords.subject.entityType',
            ])
            ->orderBy('sort_order')
            ->get();

        // Group events by phase (null-phase events go into "Unclassified")
        $phases = [];
        foreach ($events as $event) {
            $phaseName = $event->phase ?? 'Unclassified';
            if (!isset($phases[$phaseName])) {
                $phases[$phaseName] = [
                    'name' => $phaseName,
                    'events' => [],
                ];
            }
            $phases[$phaseName]['events'][] = (new TimelineEventResource($event))->resolve();
        }

        // Collect all unique entities involved as participants
        $entityIds = collect();
        foreach ($events as $event) {
            if ($event->entity_id) {
                $entityIds->push($event->entity_id);
            }
            foreach ($event->participants as $p) {
                $entityIds->push($p->entity_id);
            }
        }

        $entities = \App\Models\Entity::whereIn('id', $entityIds->unique())
            ->with(['entityType', 'images'])
            ->get()
            ->map(fn ($e) => (new \App\Http\Resources\EntitySummaryResource($e))->resolve());

        return response()->json([
            'data' => [
                'timeline' => (new \App\Http\Resources\TimelineResource($timeline))->resolve(),
                'phases' => array_values($phases),
                'entities' => $entities,
            ],
        ]);
    }
}
