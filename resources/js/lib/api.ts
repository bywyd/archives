// ============================================================
// Archives - API Client
// Typed fetch functions for all 65 API endpoints
// ============================================================

import type {
    ApiAttributeDefinition,
    ApiCategory,
    ApiEntity,
    ApiEntityGraph,
    ApiEntityLocation,
    ApiEntityAffiliationHistory,
    ApiEntityAttribute,
    ApiEntityConsciousnessRecord,
    ApiEntityDeathRecord,
    ApiEntityIntelligenceRecord,
    ApiEntityInfectionRecord,
    ApiEntityMutationStage,
    ApiEntityPowerProfile,
    ApiEntityPreview,
    ApiEntityQuote,
    ApiEntityRelation,
    ApiEntitySection,
    ApiEntityTiny,
    ApiEntityTransmissionRecord,
    ApiEntityTransmissionRelation,
    ApiImage,
    ApiMediaSource,
    ApiMetaEntityStatus,
    ApiMetaEntityType,
    ApiMetaRelationType,
    ApiSearchResult,
    ApiAdvancedSearchResponse,
    ApiEntityMap,
    ApiEntityMapFloor,
    ApiEntityMapMarker,
    ApiEntityMapRegion,
    ApiSidebarTree,
    ApiTag,
    ApiTimeline,
    ApiTimelineEvent,
    ApiUniverse,
    ApiRole,
    ApiPermission,
    ApiAdminUser,
    ApiMapData,
    ApiEntityBriefing,
    PaginatedResponse,
} from '@/types/api';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${BASE}${path}`;

    const res = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...options?.headers,
        },
        ...options,
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const error = new Error(body.message || `API Error ${res.status}`);
        (error as any).status = res.status;
        (error as any).body = body;
        throw error;
    }

    if (res.status === 204) {
        return undefined as T;
    }

    return res.json();
}

function get<T>(path: string) {
    return request<T>(path);
}

function post<T>(path: string, data?: unknown) {
    return request<T>(path, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
    });
}

function put<T>(path: string, data?: unknown) {
    return request<T>(path, {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
    });
}

function del<T = void>(path: string) {
    return request<T>(path, { method: 'DELETE' });
}

// ---- Search ----

export function globalSearch(query: string) {
    return get<{ data: ApiSearchResult[] }>(`/search?search=${encodeURIComponent(query)}`);
}

export function universeSearch(universeId: number, query: string) {
    return get<{ data: ApiSearchResult[] }>(
        `/universes/${universeId}/search?search=${encodeURIComponent(query)}`,
    );
}

export function advancedSearch(universeId: number, query: string, limit?: number) {
    const params = new URLSearchParams({ q: query });
    if (limit) params.set('limit', String(limit));
    return get<ApiAdvancedSearchResponse>(
        `/universes/${universeId}/advanced-search?${params.toString()}`,
    );
}

// ---- Meta / Lookup ----

export function fetchEntityTypes() {
    return get<{ data: ApiMetaEntityType[] }>('/meta/entity-types');
}

export function fetchEntityStatuses() {
    return get<{ data: ApiMetaEntityStatus[] }>('/meta/entity-statuses');
}

export function fetchRelationTypes() {
    return get<{ data: ApiMetaRelationType[] }>('/meta/relation-types');
}

export function fetchAttributeDefinitions() {
    return get<{ data: ApiAttributeDefinition[] }>('/meta/attribute-definitions');
}

// Meta CRUD  Entity Types
export function createEntityType(data: { name: string; slug?: string; description?: string; icon?: string; color?: string; schema?: Record<string, unknown> }) {
    return post<{ data: ApiMetaEntityType }>('/meta/entity-types', data);
}
export function updateEntityType(id: number, data: Partial<{ name: string; slug: string; description: string; icon: string; color: string; schema: Record<string, unknown> }>) {
    return put<{ data: ApiMetaEntityType }>(`/meta/entity-types/${id}`, data);
}
export function deleteEntityType(id: number) {
    return del(`/meta/entity-types/${id}`);
}

// Meta CRUD  Entity Statuses
export function createEntityStatus(data: { name: string; slug?: string; description?: string; color?: string }) {
    return post<{ data: ApiMetaEntityStatus }>('/meta/entity-statuses', data);
}
export function updateEntityStatus(id: number, data: Partial<{ name: string; slug: string; description: string; color: string }>) {
    return put<{ data: ApiMetaEntityStatus }>(`/meta/entity-statuses/${id}`, data);
}
export function deleteEntityStatus(id: number) {
    return del(`/meta/entity-statuses/${id}`);
}

// Meta CRUD  Relation Types
export function createRelationType(data: { name: string; slug?: string; description?: string; inverse_name?: string; is_directional?: boolean }) {
    return post<{ data: ApiMetaRelationType }>('/meta/relation-types', data);
}
export function updateRelationType(id: number, data: Partial<{ name: string; slug: string; description: string; inverse_name: string; is_directional: boolean }>) {
    return put<{ data: ApiMetaRelationType }>(`/meta/relation-types/${id}`, data);
}
export function deleteRelationType(id: number) {
    return del(`/meta/relation-types/${id}`);
}

// Meta CRUD  Attribute Definitions
export function createAttributeDefinition(data: { name: string; slug?: string; data_type: string; meta_entity_type_id?: number; group_name?: string; is_filterable?: boolean; is_required?: boolean; default_value?: string; sort_order?: number }) {
    return post<{ data: ApiAttributeDefinition }>('/meta/attribute-definitions', data);
}
export function updateAttributeDefinition(id: number, data: Partial<{ name: string; slug: string; data_type: string; meta_entity_type_id: number; group_name: string; is_filterable: boolean; is_required: boolean; default_value: string; sort_order: number }>) {
    return put<{ data: ApiAttributeDefinition }>(`/meta/attribute-definitions/${id}`, data);
}
export function deleteAttributeDefinition(id: number) {
    return del(`/meta/attribute-definitions/${id}`);
}

// ---- Tags ----

export function fetchTags() {
    return get<{ data: ApiTag[] }>('/tags');
}

export function createTag(data: { name: string; slug?: string; description?: string; color?: string }) {
    return post<{ data: ApiTag }>('/tags', data);
}

export function fetchTag(id: number) {
    return get<{ data: ApiTag }>(`/tags/${id}`);
}

export function updateTag(id: number, data: Partial<{ name: string; description: string; color: string }>) {
    return put<{ data: ApiTag }>(`/tags/${id}`, data);
}

export function deleteTag(id: number) {
    return del(`/tags/${id}`);
}

// ---- Universes ----

export function fetchUniverses() {
    return get<{ data: ApiUniverse[] }>('/universes');
}

export function searchUniverses(query: string, perPage = 20) {
    const params = new URLSearchParams({ search: query, per_page: String(perPage) });
    return get<{ data: ApiUniverse[] }>(`/universes?${params.toString()}`);
}

export function fetchEntityLocations(universeId: number) {
    return get<{ data: ApiEntityLocation[] }>(`/universes/${universeId}/entity-locations`);
}

export function fetchMapData(universeId: number) {
    return get<ApiMapData>(`/universes/${universeId}/map-data`);
}

export function createUniverse(data: { name: string; slug?: string; description?: string; settings?: Record<string, unknown>, compound_names?: string[] }) {
    return post<{ data: ApiUniverse }>('/universes', data);
}

export function fetchUniverse(idOrSlug: number | string) {
    return get<{ data: ApiUniverse }>(`/universes/${idOrSlug}`);
}

export function updateUniverse(id: number, data: Partial<{ name: string; slug: string; description: string; settings: Record<string, unknown>, compound_names: string[] }>) {
    return put<{ data: ApiUniverse }>(`/universes/${id}`, data);
}

export function deleteUniverse(id: number) {
    return del(`/universes/${id}`);
}

export function fetchSidebarTree(universeId: number) {
    return get<{ data: ApiSidebarTree }>(`/universes/${universeId}/sidebar-tree`);
}

// ---- Entities ----

export type FetchEntitiesParams = {
    search?: string;
    type?: string;
    status?: string;
    tag?: string;
    category?: string;
    featured?: boolean;
    sort?: string;
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
};

function buildQuery(params: Record<string, unknown>): string {
    const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');

    return qs ? `?${qs}` : '';
}

export function fetchEntities(universeId: number, params?: FetchEntitiesParams) {
    return get<PaginatedResponse<ApiEntity>>(
        `/universes/${universeId}/entities${buildQuery(params ?? {})}`,
    );
}

export function createEntity(universeId: number, data: Record<string, unknown>) {
    return post<{ data: ApiEntity }>(`/universes/${universeId}/entities`, data);
}

export function fetchEntity(universeId: number, idOrSlug: number | string) {
    return get<{ data: ApiEntity }>(`/universes/${universeId}/entities/${idOrSlug}`);
}

export function fetchEntityPreview(universeSlug: string, entitySlug: string) {
    return get<{ data: ApiEntityPreview }>(`/universes/${universeSlug}/entities/${entitySlug}/preview`);
}

export function fetchEntityGraph(universeId: number, idOrSlug: number | string) {
    return get<{ data: ApiEntityGraph }>(`/universes/${universeId}/entities/${idOrSlug}/graph`);
}

export function updateEntity(universeId: number, id: number, data: Record<string, unknown>) {
    return put<{ data: ApiEntity }>(`/universes/${universeId}/entities/${id}`, data);
}

export function deleteEntity(universeId: number, id: number) {
    return del(`/universes/${universeId}/entities/${id}`);
}

export function fetchEntityRelations(universeId: number, entityId: number) {
    return get<{ outgoing: ApiEntityRelation[]; incoming: ApiEntityRelation[] }>(
        `/universes/${universeId}/entities/${entityId}/relations`,
    );
}

export function fetchEntityInfectionRecords(universeId: number, entityId: number) {
    return get<{ data: ApiEntityInfectionRecord[] }>(
        `/universes/${universeId}/entities/${entityId}/infection-records`,
    );
}

export function fetchEntityMutationStages(universeId: number, entityId: number) {
    return get<{ data: ApiEntityMutationStage[] }>(
        `/universes/${universeId}/entities/${entityId}/mutation-stages`,
    );
}

export function fetchEntityAffiliationHistory(universeId: number, entityId: number) {
    return get<{ data: ApiEntityAffiliationHistory[] }>(
        `/universes/${universeId}/entities/${entityId}/affiliation-history`,
    );
}

export function fetchEntityQuotes(universeId: number, entityId: number) {
    return get<{ data: ApiEntityQuote[] }>(
        `/universes/${universeId}/entities/${entityId}/quotes`,
    );
}

export function fetchEntityPowerProfiles(universeId: number, entityId: number) {
    return get<{ data: ApiEntityPowerProfile[] }>(
        `/universes/${universeId}/entities/${entityId}/power-profiles`,
    );
}

export function fetchEntityConsciousnessRecords(universeId: number, entityId: number) {
    return get<{ data: ApiEntityConsciousnessRecord[] }>(
        `/universes/${universeId}/entities/${entityId}/consciousness-records`,
    );
}

export function fetchEntityIntelligenceRecords(universeId: number, entityId: number) {
    return get<{ data: ApiEntityIntelligenceRecord[] }>(
        `/universes/${universeId}/entities/${entityId}/intelligence-records`,
    );
}

export function fetchEntityDeathRecords(universeId: number, entityId: number) {
    return get<{ data: ApiEntityDeathRecord[] }>(
        `/universes/${universeId}/entities/${entityId}/death-records`,
    );
}

export function fetchEntityTransmissionParticipants(universeId: number, entityId: number) {
    return get<{ data: ApiEntityTransmissionRelation[] }>(
        `/universes/${universeId}/entities/${entityId}/transmission-participants`,
    );
}

export function fetchEntityTransmissionRecords(universeId: number, entityId: number) {
    return get<{ data: ApiEntityTransmissionRecord[] }>(
        `/universes/${universeId}/entities/${entityId}/transmission-records`,
    );
}

export function fetchEntityRelatedByTag(
    universeId: number,
    entityId: number,
): Promise<{ data: Record<string, { tag: ApiTag; entities: ApiEntityTiny[] }> }> {
    return get(`/universes/${universeId}/entities/${entityId}/related-by-tag`);
}

// ---- Entity Sections ----

export function fetchEntitySections(universeId: number, entityId: number) {
    return get<{ data: ApiEntitySection[] }>(
        `/universes/${universeId}/entities/${entityId}/sections`,
    );
}

export function createEntitySection(universeId: number, entityId: number, data: Record<string, unknown>) {
    return post<{ data: ApiEntitySection }>(
        `/universes/${universeId}/entities/${entityId}/sections`,
        data,
    );
}

export function updateEntitySection(universeId: number, entityId: number, sectionId: number, data: Record<string, unknown>) {
    return put<{ data: ApiEntitySection }>(
        `/universes/${universeId}/entities/${entityId}/sections/${sectionId}`,
        data,
    );
}

export function deleteEntitySection(universeId: number, entityId: number, sectionId: number) {
    return del(`/universes/${universeId}/entities/${entityId}/sections/${sectionId}`);
}

export function reorderEntitySections(universeId: number, entityId: number, order: number[]) {
    return post(`/universes/${universeId}/entities/${entityId}/sections/reorder`, { order });
}

// ---- Entity Attributes ----

export function fetchEntityAttributes(universeId: number, entityId: number) {
    return get<{ data: ApiEntityAttribute[] }>(
        `/universes/${universeId}/entities/${entityId}/attributes`,
    );
}

export function createEntityAttribute(universeId: number, entityId: number, data: Record<string, unknown>) {
    return post<{ data: ApiEntityAttribute }>(
        `/universes/${universeId}/entities/${entityId}/attributes`,
        data,
    );
}

export function bulkUpdateEntityAttributes(universeId: number, entityId: number, attributes: Record<string, unknown>[]) {
    return put(
        `/universes/${universeId}/entities/${entityId}/attributes/bulk`,
        { attributes },
    );
}

export function deleteEntityAttribute(universeId: number, entityId: number, attributeId: number) {
    return del(`/universes/${universeId}/entities/${entityId}/attributes/${attributeId}`);
}

// ---- Entity Relations ----

export function fetchRelations(universeId: number) {
    return get<{ data: ApiEntityRelation[] }>(`/universes/${universeId}/relations`);
}

export function createRelation(universeId: number, data: Record<string, unknown>) {
    return post<{ data: ApiEntityRelation }>(`/universes/${universeId}/relations`, data);
}

export function fetchRelation(universeId: number, id: number) {
    return get<{ data: ApiEntityRelation }>(`/universes/${universeId}/relations/${id}`);
}

export function updateRelation(universeId: number, id: number, data: Record<string, unknown>) {
    return put<{ data: ApiEntityRelation }>(`/universes/${universeId}/relations/${id}`, data);
}

export function deleteRelation(universeId: number, id: number) {
    return del(`/universes/${universeId}/relations/${id}`);
}

// ---- Timelines ----

export function fetchTimelines(universeId: number) {
    return get<{ data: ApiTimeline[] }>(`/universes/${universeId}/timelines`);
}

export function createTimeline(universeId: number, data: Record<string, unknown>) {
    return post<{ data: ApiTimeline }>(`/universes/${universeId}/timelines`, data);
}

export function fetchTimeline(universeId: number, id: number) {
    return get<{ data: ApiTimeline }>(`/universes/${universeId}/timelines/${id}`);
}

export function updateTimeline(universeId: number, id: number, data: Record<string, unknown>) {
    return put<{ data: ApiTimeline }>(`/universes/${universeId}/timelines/${id}`, data);
}

export function deleteTimeline(universeId: number, id: number) {
    return del(`/universes/${universeId}/timelines/${id}`);
}

export function attachEntityToTimeline(
    universeId: number,
    timelineId: number,
    data: { entity_id: number; role?: string; notes?: string; fictional_start?: string; fictional_end?: string },
) {
    return post(`/universes/${universeId}/timelines/${timelineId}/entities`, data);
}

export function detachEntityFromTimeline(universeId: number, timelineId: number, entityId: number) {
    return del(`/universes/${universeId}/timelines/${timelineId}/entities/${entityId}`);
}

// ---- Timeline Events ----

export function fetchTimelineEvents(universeId: number, timelineId: number) {
    return get<{ data: ApiTimelineEvent[] }>(
        `/universes/${universeId}/timelines/${timelineId}/events`,
    );
}

export function createTimelineEvent(universeId: number, timelineId: number, data: Record<string, unknown>) {
    return post<{ data: ApiTimelineEvent }>(
        `/universes/${universeId}/timelines/${timelineId}/events`,
        data,
    );
}

export function updateTimelineEvent(universeId: number, timelineId: number, eventId: number, data: Record<string, unknown>) {
    return put<{ data: ApiTimelineEvent }>(
        `/universes/${universeId}/timelines/${timelineId}/events/${eventId}`,
        data,
    );
}

export function deleteTimelineEvent(universeId: number, timelineId: number, eventId: number) {
    return del(`/universes/${universeId}/timelines/${timelineId}/events/${eventId}`);
}

export function fetchTimelineReconstruction(universeId: number, timelineId: number) {
    return get<{
        data: {
            timeline: ApiTimeline;
            phases: Array<{ name: string; events: ApiTimelineEvent[] }>;
            entities: import('@/types/api').ApiEntitySummary[];
        };
    }>(`/universes/${universeId}/timelines/${timelineId}/reconstruction`);
}

export function fetchEntityReconstruction(universeId: number, entitySlug: string) {
    return get<{
        data: import('@/types/api').ApiReconstructionResponse;
    }>(`/universes/${universeId}/entities/${entitySlug}/reconstruction`);
}

// ---- Media Sources ----

export function fetchMediaSources(universeId: number) {
    return get<{ data: ApiMediaSource[] }>(`/universes/${universeId}/media-sources`);
}

export function createMediaSource(universeId: number, data: Record<string, unknown>) {
    return post<{ data: ApiMediaSource }>(`/universes/${universeId}/media-sources`, data);
}

export function fetchMediaSource(universeId: number, id: number) {
    return get<{ data: ApiMediaSource }>(`/universes/${universeId}/media-sources/${id}`);
}

export function updateMediaSource(universeId: number, id: number, data: Record<string, unknown>) {
    return put<{ data: ApiMediaSource }>(`/universes/${universeId}/media-sources/${id}`, data);
}

export function deleteMediaSource(universeId: number, id: number) {
    return del(`/universes/${universeId}/media-sources/${id}`);
}

export function attachEntityToMediaSource(
    universeId: number,
    mediaSourceId: number,
    data: { entity_id: number; role?: string; description?: string },
) {
    return post(`/universes/${universeId}/media-sources/${mediaSourceId}/entities`, data);
}

export function detachEntityFromMediaSource(universeId: number, mediaSourceId: number, entityId: number) {
    return del(`/universes/${universeId}/media-sources/${mediaSourceId}/entities/${entityId}`);
}

// ---- Categories ----

export function fetchCategories(universeId: number) {
    return get<{ data: ApiCategory[] }>(`/universes/${universeId}/categories`);
}

export function createCategory(universeId: number, data: Record<string, unknown>) {
    return post<{ data: ApiCategory }>(`/universes/${universeId}/categories`, data);
}

export function fetchCategory(universeId: number, id: number) {
    return get<{ data: ApiCategory }>(`/universes/${universeId}/categories/${id}`);
}

export function updateCategory(universeId: number, id: number, data: Record<string, unknown>) {
    return put<{ data: ApiCategory }>(`/universes/${universeId}/categories/${id}`, data);
}

export function deleteCategory(universeId: number, id: number) {
    return del(`/universes/${universeId}/categories/${id}`);
}

// ---- Images (CDN Upload) ----

export function uploadImage(data: FormData) {
    // Use raw fetch for multipart/form-data (no JSON content-type)
    return request<{ data: ApiImage }>('/images', {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: data,
    });
}

export function updateImage(imageId: number, data: Partial<{ type: string; alt_text: string; caption: string; credit: string; sort_order: number }>) {
    return put<{ data: ApiImage }>(`/images/${imageId}`, data);
}

export function deleteImage(imageId: number) {
    return del(`/images/${imageId}`);
}

// ---- Entity Maps ----

export function fetchEntityMaps(universeId: number, entityId: number) {
    return get<{ data: ApiEntityMap[] }>(
        `/universes/${universeId}/entities/${entityId}/maps`,
    );
}

export function fetchEntityMap(universeId: number, entityId: number, mapId: number | string) {
    return get<{ data: ApiEntityMap }>(
        `/universes/${universeId}/entities/${entityId}/maps/${mapId}`,
    );
}

export function createEntityMap(universeId: number, entityId: number, data: Record<string, unknown>) {
    return post<{ data: ApiEntityMap }>(
        `/universes/${universeId}/entities/${entityId}/maps`,
        data,
    );
}

export function updateEntityMap(universeId: number, entityId: number, mapId: number, data: Record<string, unknown>) {
    return put<{ data: ApiEntityMap }>(
        `/universes/${universeId}/entities/${entityId}/maps/${mapId}`,
        data,
    );
}

export function deleteEntityMap(universeId: number, entityId: number, mapId: number) {
    return del(`/universes/${universeId}/entities/${entityId}/maps/${mapId}`);
}

export function createMapFloor(universeId: number, entityId: number, mapId: number, data: Record<string, unknown>) {
    return post<{ data: ApiEntityMapFloor }>(
        `/universes/${universeId}/entities/${entityId}/maps/${mapId}/floors`,
        data,
    );
}

export function updateMapFloor(universeId: number, entityId: number, mapId: number, floorId: number, data: Record<string, unknown>) {
    return put<{ data: ApiEntityMapFloor }>(
        `/universes/${universeId}/entities/${entityId}/maps/${mapId}/floors/${floorId}`,
        data,
    );
}

export function deleteMapFloor(universeId: number, entityId: number, mapId: number, floorId: number) {
    return del(`/universes/${universeId}/entities/${entityId}/maps/${mapId}/floors/${floorId}`);
}

export function createMapMarker(universeId: number, entityId: number, mapId: number, data: Record<string, unknown>) {
    return post<{ data: ApiEntityMapMarker }>(
        `/universes/${universeId}/entities/${entityId}/maps/${mapId}/markers`,
        data,
    );
}

export function updateMapMarker(universeId: number, entityId: number, mapId: number, markerId: number, data: Record<string, unknown>) {
    return put<{ data: ApiEntityMapMarker }>(
        `/universes/${universeId}/entities/${entityId}/maps/${mapId}/markers/${markerId}`,
        data,
    );
}

export function deleteMapMarker(universeId: number, entityId: number, mapId: number, markerId: number) {
    return del(`/universes/${universeId}/entities/${entityId}/maps/${mapId}/markers/${markerId}`);
}

export function createMapRegion(universeId: number, entityId: number, mapId: number, data: Record<string, unknown>) {
    return post<{ data: ApiEntityMapRegion }>(
        `/universes/${universeId}/entities/${entityId}/maps/${mapId}/regions`,
        data,
    );
}

export function updateMapRegion(universeId: number, entityId: number, mapId: number, regionId: number, data: Record<string, unknown>) {
    return put<{ data: ApiEntityMapRegion }>(
        `/universes/${universeId}/entities/${entityId}/maps/${mapId}/regions/${regionId}`,
        data,
    );
}

export function deleteMapRegion(universeId: number, entityId: number, mapId: number, regionId: number) {
    return del(`/universes/${universeId}/entities/${entityId}/maps/${mapId}/regions/${regionId}`);
}

// ---- Entity Records (Unified CRUD for sub-records) ----

export type RecordType =
    | 'infection-records'
    | 'mutation-stages'
    | 'affiliation-history'
    | 'quotes'
    | 'power-profiles'
    | 'consciousness-records'
    | 'intelligence-records'
    | 'death-records'
    | 'transmission-participants'
    | 'transmission-records';

export function createEntityRecord(universeId: number, entityId: number, recordType: RecordType, data: Record<string, unknown>) {
    return post(`/universes/${universeId}/entities/${entityId}/records/${recordType}`, data);
}

export function updateEntityRecord(universeId: number, entityId: number, recordType: RecordType, recordId: number, data: Record<string, unknown>) {
    return put(`/universes/${universeId}/entities/${entityId}/records/${recordType}/${recordId}`, data);
}

export function deleteEntityRecord(universeId: number, entityId: number, recordType: RecordType, recordId: number) {
    return del(`/universes/${universeId}/entities/${entityId}/records/${recordType}/${recordId}`);
}

// ---- RBAC (Admin) ----

export function fetchAdminUsers() {
    return get<ApiAdminUser[]>('/rbac/users');
}

export function fetchRoles() {
    return get<ApiRole[]>('/rbac/roles');
}

export function createRole(data: { name: string; slug: string; description?: string }) {
    return post<ApiRole>('/rbac/roles', data);
}

export function updateRole(id: number, data: Partial<{ name: string; slug: string; description: string }>) {
    return put<ApiRole>(`/rbac/roles/${id}`, data);
}

export function deleteRole(id: number) {
    return del(`/rbac/roles/${id}`);
}

export function fetchPermissions() {
    return get<ApiPermission[]>('/rbac/permissions');
}

export function syncRolePermissions(roleId: number, permissionIds: number[]) {
    return put<ApiRole>(`/rbac/roles/${roleId}/permissions`, { permission_ids: permissionIds });
}

export function fetchUserRoles(userId: number) {
    return get<ApiRole[]>(`/rbac/users/${userId}/roles`);
}

export function syncUserRoles(userId: number, roleIds: number[]) {
    return put<ApiRole[]>(`/rbac/users/${userId}/roles`, { role_ids: roleIds });
}

//  Lock toggles 

export function toggleUniverseLock(universeId: number) {
    return put<ApiUniverse>(`/universes/${universeId}/lock`, {});
}

export function toggleEntityLock(universeId: number, entityId: number) {
    return put<ApiEntity>(`/universes/${universeId}/entities/${entityId}/lock`, {});
}

//  Revisions 

export function fetchEntityRevisions(universeId: number, entityId: number) {
    return get<{ data: import('@/types/api').ApiRevision[] }>(
        `/universes/${universeId}/entities/${entityId}/revisions`,
    );
}

export function rollbackEntityRevision(universeId: number, entityId: number, revisionId: number) {
    return post<{ message: string; entity: { id: number; name: string; slug: string } }>(
        `/universes/${universeId}/entities/${entityId}/revisions/${revisionId}/rollback`,
        {},
    );
}

export function restoreEntity(universeId: number, entityId: number) {
    return post<{ message: string; entity: { id: number; name: string; slug: string; universe_slug: string } }>(
        `/universes/${universeId}/entities/${entityId}/restore`,
        {},
    );
}

//  Entity Briefing 

export function fetchEntityBriefing(universeId: number, entitySlug: string) {
    return get<{ data: ApiEntityBriefing }>(`/universes/${universeId}/entities/${entitySlug}/briefing`);
}
