-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Table: employees
create table employees (
    id uuid primary key default uuid_generate_v4(),
    full_name text not null,
    employee_id text unique,
    department text,
    phone_number text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: packages
create table packages (
    id uuid primary key default uuid_generate_v4(),
    receipt_image_url text not null,
    recipient_name_raw text not null,
    employee_id uuid references employees(id) on delete set null,
    match_confidence numeric default 0,
    tracking_number text not null,
    courier text not null,
    status text not null check (status in ('belum_diambil', 'sudah_diambil')),
    received_at timestamp with time zone default timezone('utc'::text, now()) not null,
    picked_up_at timestamp with time zone,
    picked_up_verification text check (picked_up_verification in ('qr', 'pin', 'signature')),
    admin_id uuid references auth.users(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table employees enable row level security;
alter table packages enable row level security;

-- Policies for employees
create policy "Authenticated users can select employees"
    on employees for select
    to authenticated
    using (true);

create policy "Authenticated users can insert employees"
    on employees for insert
    to authenticated
    with check (true);

create policy "Authenticated users can update employees"
    on employees for update
    to authenticated
    using (true);

create policy "Authenticated users can delete employees"
    on employees for delete
    to authenticated
    using (true);

-- Policies for packages
create policy "Authenticated users can select packages"
    on packages for select
    to authenticated
    using (true);

create policy "Authenticated users can insert packages"
    on packages for insert
    to authenticated
    with check (true);

create policy "Authenticated users can update packages"
    on packages for update
    to authenticated
    using (true);

create policy "Authenticated users can delete packages"
    on packages for delete
    to authenticated
    using (true);

-- Storage bucket for receipts
insert into storage.buckets (id, name, public) 
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

-- Storage policies for receipts bucket
create policy "Public access to receipts"
    on storage.objects for select
    using ( bucket_id = 'receipts' );

create policy "Authenticated users can upload receipts"
    on storage.objects for insert
    to authenticated
    with check ( bucket_id = 'receipts' );
