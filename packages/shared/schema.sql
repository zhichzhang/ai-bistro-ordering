-- =========================================================
-- Extensions
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- Menu Domain
-- =========================================================

create table categories (
                            id uuid primary key default gen_random_uuid(),

                            code text not null unique,

                            name text not null,

                            sort_order int not null default 0,

                            created_at timestamptz not null default now()
);

-- =========================================================

create table menu_items (
                            id text primary key,

                            category_id uuid not null
                                references categories(id)
                                    on delete restrict,

                            name text not null,

                            price_cents int not null
                                check (price_cents >= 0),

                            image_url text not null default '',

                            is_available boolean not null default true,

                            sort_order int not null default 0,

                            created_at timestamptz not null default now(),

                            updated_at timestamptz not null default now()
);

create index idx_menu_items_category_id
    on menu_items(category_id);

create index idx_menu_items_is_available
    on menu_items(is_available);

-- =========================================================

create table modifier_groups (
                                 id uuid primary key default gen_random_uuid(),

                                 code text not null unique,

                                 name text not null,

                                 is_required boolean not null default false,

                                 min_select int not null default 0
                                     check (min_select >= 0),

                                 max_select int not null default 1
                                     check (max_select >= 1),

                                 created_at timestamptz not null default now()
);

-- =========================================================

create table modifier_options (
                                  id uuid primary key default gen_random_uuid(),

                                  modifier_group_id uuid not null
                                      references modifier_groups(id)
                                          on delete cascade,

                                  code text not null,

                                  name text not null,

                                  price_delta_cents int not null default 0,

                                  sort_order int not null default 0,

                                  created_at timestamptz not null default now(),

                                  unique(modifier_group_id, code)
);

create index idx_modifier_options_group_id
    on modifier_options(modifier_group_id);

-- =========================================================

create table menu_item_modifier_groups (
                                           menu_item_id text not null
                                               references menu_items(id)
                                                   on delete cascade,

                                           modifier_group_id uuid not null
                                               references modifier_groups(id)
                                                   on delete cascade,

                                           primary key (
                                                        menu_item_id,
                                                        modifier_group_id
                                               )
);

create index idx_menu_item_modifier_groups_group_id
    on menu_item_modifier_groups(modifier_group_id);

-- =========================================================

create table menu_aliases (
                              alias text not null,

                              menu_item_id text not null
                                  references menu_items(id)
                                      on delete cascade,

                              created_at timestamptz not null default now(),

                              primary key (
                                           alias,
                                           menu_item_id
                                  )
);

create index idx_menu_aliases_alias
    on menu_aliases(alias);

create index idx_menu_aliases_menu_item_id
    on menu_aliases(menu_item_id);

-- =========================================================
-- Cart and Session Domain
-- =========================================================

create table carts (
                       id uuid primary key default gen_random_uuid(),

                       status text not null default 'active'
                           check (
                               status in (
                                          'active',
                                          'reviewing',
                                          'submitted'
                                   )
                               ),

                       revision int not null default 0
                           check (revision >= 0),

                       created_at timestamptz not null default now(),

                       updated_at timestamptz not null default now()
);

create index idx_carts_status
    on carts(status);

-- =========================================================

create table chat_sessions (
                               id uuid primary key default gen_random_uuid(),

                               cart_id uuid unique
                                                      references carts(id)
                                                          on delete set null,

                               created_at timestamptz not null default now(),

                               updated_at timestamptz not null default now()
);

create index idx_chat_sessions_cart_id
    on chat_sessions(cart_id);

-- =========================================================

create table chat_messages (
                               id uuid primary key default gen_random_uuid(),

                               chat_session_id uuid not null
                                   references chat_sessions(id)
                                       on delete cascade,

                               role text not null
                                   check (
                                       role in (
                                                'user',
                                                'assistant',
                                                'system'
                                           )
                                       ),

                               content text not null,

                               parsed_action jsonb,

                               error_type text,

                               created_at timestamptz not null default now()
);

create index idx_chat_messages_chat_session_id
    on chat_messages(chat_session_id);

create index idx_chat_messages_created_at
    on chat_messages(created_at);

-- =========================================================
-- Cart Domain
-- =========================================================

create table cart_items (
                            id uuid primary key default gen_random_uuid(),

                            cart_id uuid not null
                                references carts(id)
                                    on delete cascade,

                            menu_item_id text not null
                                references menu_items(id),

                            canonical_identity text not null,

                            quantity int not null
                                check (quantity > 0),

                            unit_price_cents int not null
                                check (unit_price_cents >= 0),

                            line_total_cents int not null
                                check (line_total_cents >= 0),

                            note text,

                            position int not null,

                            source_chat_message_id uuid
                                references chat_messages(id)
                                             on delete set null,

                            source_action_index int,

                            source_chat_message_action_id uuid,

                            created_at timestamptz not null default now(),

                            updated_at timestamptz not null default now(),

                            unique(cart_id, position)
);

create index idx_cart_items_cart_id
    on cart_items(cart_id);

create index idx_cart_items_menu_item_id
    on cart_items(menu_item_id);

create index idx_cart_items_position
    on cart_items(cart_id, position);

create index idx_cart_items_canonical_identity
    on cart_items(cart_id, canonical_identity);

-- =========================================================

create table cart_item_modifiers (
                                     id uuid primary key default gen_random_uuid(),

                                     cart_item_id uuid not null
                                         references cart_items(id)
                                             on delete cascade,

                                     modifier_group_id uuid not null
                                         references modifier_groups(id),

                                     modifier_option_id uuid not null
                                         references modifier_options(id),

                                     modifier_group_code text not null,

                                     modifier_option_code text not null,

                                     created_at timestamptz not null default now(),

                                     unique(cart_item_id, modifier_group_id)
);

create index idx_cart_item_modifiers_cart_item_id
    on cart_item_modifiers(cart_item_id);

create index idx_cart_item_modifiers_group_id
    on cart_item_modifiers(modifier_group_id);

create index idx_cart_item_modifiers_option_id
    on cart_item_modifiers(modifier_option_id);

create index idx_cart_item_modifiers_group_code
    on cart_item_modifiers(modifier_group_code);

create index idx_cart_item_modifiers_option_code
    on cart_item_modifiers(modifier_option_code);

-- =========================================================
-- Conversational Action Domain
-- =========================================================

create table chat_message_actions (
                                      id uuid primary key default gen_random_uuid(),

                                      chat_message_id uuid not null
                                          references chat_messages(id)
                                              on delete cascade,

                                      cart_id uuid
                                                           references carts(id)
                                                               on delete set null,

                                      action_index int not null,

                                      action_type text not null
                                          check (
                                              action_type in (
                                                              'add_item',
                                                              'remove_item',
                                                              'update_quantity',
                                                              'modify_item',
                                                              'clear_cart',
                                                              'view_cart',
                                                              'clarify',
                                                              'unknown'
                                                  )
                                              ),

                                      intent text not null
                                          check (
                                              intent in (
                                                         'multi_action',
                                                         'add_item',
                                                         'remove_item',
                                                         'update_quantity',
                                                         'modify_item',
                                                         'clear_cart',
                                                         'view_cart',
                                                         'clarify',
                                                         'unknown',
                                                         'invalid_item'
                                                  )
                                              ),

                                      status text not null
                                          check (
                                              status in (
                                                         'pending',
                                                         'success',
                                                         'needs_clarification',
                                                         'error',
                                                         'skipped'
                                                  )
                                              ),

                                      normalized_action jsonb not null default '{}'::jsonb,

                                      resolved_action jsonb,

                                      question text,

                                      message text,

                                      error_type text,

                                      error_message text,

                                      confidence numeric(4,3) not null default 0
                                          check (
                                              confidence >= 0
                                                  and confidence <= 1
                                              ),

                                      depends_on int[] not null default '{}',

                                      reference_type text
                                          check (
                                              reference_type is null
                                                  or reference_type in (
                                                                        'none',
                                                                        'previous_action',
                                                                        'cart_item_id',
                                                                        'cart_position',
                                                                        'explicit_cart_reference'
                                                  )
                                              ),

                                      reference_action_index int,

                                      reference_cart_item_id uuid,

                                      reference_cart_position int,

                                      reference_text text,

                                      resolved_menu_item_id text
                                          references menu_items(id)
                                                               on delete set null,

                                      resolved_cart_item_id uuid,

                                      execution_order int,

                                      executed_at timestamptz,

                                      created_at timestamptz not null default now(),

                                      updated_at timestamptz not null default now(),

                                      unique(chat_message_id, action_index)
);

create index idx_chat_message_actions_chat_message_id
    on chat_message_actions(chat_message_id);

create index idx_chat_message_actions_cart_id
    on chat_message_actions(cart_id);

create index idx_chat_message_actions_status
    on chat_message_actions(status);

create index idx_chat_message_actions_action_index
    on chat_message_actions(action_index);

create index idx_chat_message_actions_resolved_menu_item_id
    on chat_message_actions(resolved_menu_item_id);

create index idx_chat_message_actions_resolved_cart_item_id
    on chat_message_actions(resolved_cart_item_id);

-- =========================================================
-- Circular Foreign Keys
-- =========================================================

alter table cart_items
    add constraint fk_cart_items_source_chat_message_action_id
        foreign key (source_chat_message_action_id)
            references chat_message_actions(id)
            on delete set null;

alter table chat_message_actions
    add constraint fk_chat_message_actions_resolved_cart_item_id
        foreign key (resolved_cart_item_id)
            references cart_items(id)
            on delete set null;

-- =========================================================
-- Infrastructure
-- =========================================================

create or replace function set_updated_at()
returns trigger
as $$
begin
    new.updated_at = now();
return new;
end;
$$ language plpgsql;

-- =========================================================

create trigger trg_menu_items_updated_at
    before update on menu_items
    for each row
    execute function set_updated_at();

create trigger trg_carts_updated_at
    before update on carts
    for each row
    execute function set_updated_at();

create trigger trg_chat_sessions_updated_at
    before update on chat_sessions
    for each row
    execute function set_updated_at();

create trigger trg_cart_items_updated_at
    before update on cart_items
    for each row
    execute function set_updated_at();

create trigger trg_chat_message_actions_updated_at
    before update on chat_message_actions
    for each row
    execute function set_updated_at();

-- =========================================================
-- Cart Revision Infrastructure
-- =========================================================

create or replace function increment_cart_revision(
    p_cart_id uuid
)
returns void
language plpgsql
as $$
begin

update carts
set revision = revision + 1
where id = p_cart_id;

end;
$$;