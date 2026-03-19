-- CloudBooks Pro Database Initialization
-- This script runs when PostgreSQL container starts

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create public schema tables for multi-tenant management

-- Tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    industry VARCHAR(100),
    address JSONB DEFAULT '{}',
    phone VARCHAR(20),
    email VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    logo_url VARCHAR(500),
    fiscal_year_start_month INTEGER DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
    accounting_method VARCHAR(10) DEFAULT 'accrual' CHECK (accounting_method IN ('cash', 'accrual')),
    home_currency VARCHAR(3) DEFAULT 'AED',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    number_format JSONB DEFAULT '{"thousandSeparator": ",", "decimalSeparator": "."}',
    tax_registration_number VARCHAR(50),
    schema_name VARCHAR(100) UNIQUE NOT NULL,
    subscription_id UUID,
    is_active BOOLEAN DEFAULT true,
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_step INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (global)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    is_email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP WITH TIME ZONE,
    is_mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant Users (junction table)
CREATE TABLE IF NOT EXISTS public.tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    role_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT true,
    invited_by UUID REFERENCES public.users(id),
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tenant_id)
);

-- Roles table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,
    UNIQUE(module, action)
);

-- Role Permissions junction
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    refresh_token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    plan_tier VARCHAR(20) NOT NULL CHECK (plan_tier IN ('starter', 'essentials', 'plus', 'advanced')),
    status VARCHAR(20) DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'expired')),
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    add_ons JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON public.tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON public.tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON public.sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON public.subscriptions(tenant_id);

-- Insert default permissions
INSERT INTO public.permissions (module, action) VALUES
    ('customers', 'view'), ('customers', 'create'), ('customers', 'edit'), ('customers', 'delete'), ('customers', 'approve'), ('customers', 'export'),
    ('vendors', 'view'), ('vendors', 'create'), ('vendors', 'edit'), ('vendors', 'delete'), ('vendors', 'approve'), ('vendors', 'export'),
    ('invoices', 'view'), ('invoices', 'create'), ('invoices', 'edit'), ('invoices', 'delete'), ('invoices', 'approve'), ('invoices', 'export'),
    ('bills', 'view'), ('bills', 'create'), ('bills', 'edit'), ('bills', 'delete'), ('bills', 'approve'), ('bills', 'export'),
    ('expenses', 'view'), ('expenses', 'create'), ('expenses', 'edit'), ('expenses', 'delete'), ('expenses', 'approve'), ('expenses', 'export'),
    ('banking', 'view'), ('banking', 'create'), ('banking', 'edit'), ('banking', 'delete'), ('banking', 'approve'), ('banking', 'export'),
    ('reports', 'view'), ('reports', 'create'), ('reports', 'edit'), ('reports', 'delete'), ('reports', 'approve'), ('reports', 'export'),
    ('payroll', 'view'), ('payroll', 'create'), ('payroll', 'edit'), ('payroll', 'delete'), ('payroll', 'approve'), ('payroll', 'export'),
    ('inventory', 'view'), ('inventory', 'create'), ('inventory', 'edit'), ('inventory', 'delete'), ('inventory', 'approve'), ('inventory', 'export'),
    ('taxes', 'view'), ('taxes', 'create'), ('taxes', 'edit'), ('taxes', 'delete'), ('taxes', 'approve'), ('taxes', 'export'),
    ('settings', 'view'), ('settings', 'create'), ('settings', 'edit'), ('settings', 'delete'), ('settings', 'approve'), ('settings', 'export'),
    ('users', 'view'), ('users', 'create'), ('users', 'edit'), ('users', 'delete'), ('users', 'approve'), ('users', 'export'),
    ('journal_entries', 'view'), ('journal_entries', 'create'), ('journal_entries', 'edit'), ('journal_entries', 'delete'), ('journal_entries', 'approve'), ('journal_entries', 'export'),
    ('budgets', 'view'), ('budgets', 'create'), ('budgets', 'edit'), ('budgets', 'delete'), ('budgets', 'approve'), ('budgets', 'export'),
    ('projects', 'view'), ('projects', 'create'), ('projects', 'edit'), ('projects', 'delete'), ('projects', 'approve'), ('projects', 'export'),
    ('time_tracking', 'view'), ('time_tracking', 'create'), ('time_tracking', 'edit'), ('time_tracking', 'delete'), ('time_tracking', 'approve'), ('time_tracking', 'export'),
    ('estimates', 'view'), ('estimates', 'create'), ('estimates', 'edit'), ('estimates', 'delete'), ('estimates', 'approve'), ('estimates', 'export'),
    ('products', 'view'), ('products', 'create'), ('products', 'edit'), ('products', 'delete'), ('products', 'approve'), ('products', 'export')
ON CONFLICT (module, action) DO NOTHING;

-- Function to create tenant schema
CREATE OR REPLACE FUNCTION create_tenant_schema(schema_name TEXT) RETURNS VOID AS $$
BEGIN
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);

    -- Chart of Accounts
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.accounts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        account_number VARCHAR(20),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        detail_type VARCHAR(100),
        description TEXT,
        currency VARCHAR(3) DEFAULT ''AED'',
        tax_code_id UUID,
        is_active BOOLEAN DEFAULT true,
        is_sub_account BOOLEAN DEFAULT false,
        parent_account_id UUID,
        is_system_account BOOLEAN DEFAULT false,
        system_account_type VARCHAR(50),
        current_balance DECIMAL(19,4) DEFAULT 0,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(account_number)
    )', schema_name);

    -- Customers
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.customers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        display_name VARCHAR(255) NOT NULL,
        company_name VARCHAR(255),
        title VARCHAR(50),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(20),
        mobile VARCHAR(20),
        fax VARCHAR(20),
        website VARCHAR(255),
        billing_address JSONB DEFAULT ''{}'',
        shipping_address JSONB DEFAULT ''{}'',
        tax_registration_number VARCHAR(50),
        payment_terms VARCHAR(20) DEFAULT ''net_30'',
        custom_payment_days INTEGER,
        preferred_payment_method VARCHAR(20),
        preferred_delivery_method VARCHAR(10) DEFAULT ''email'',
        opening_balance DECIMAL(19,4) DEFAULT 0,
        opening_balance_date DATE,
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        parent_customer_id UUID,
        custom_fields JSONB DEFAULT ''{}'',
        current_balance DECIMAL(19,4) DEFAULT 0,
        overdue_balance DECIMAL(19,4) DEFAULT 0,
        credit_balance DECIMAL(19,4) DEFAULT 0,
        last_payment_date DATE,
        ytd_revenue DECIMAL(19,4) DEFAULT 0,
        total_revenue DECIMAL(19,4) DEFAULT 0,
        total_payments DECIMAL(19,4) DEFAULT 0,
        transaction_count INTEGER DEFAULT 0,
        average_days_to_pay INTEGER DEFAULT 0,
        last_transaction_date DATE,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Vendors
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.vendors (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        display_name VARCHAR(255) NOT NULL,
        company_name VARCHAR(255),
        title VARCHAR(50),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(20),
        mobile VARCHAR(20),
        fax VARCHAR(20),
        website VARCHAR(255),
        billing_address JSONB DEFAULT ''{}'',
        shipping_address JSONB DEFAULT ''{}'',
        vendor_account_number VARCHAR(50),
        is_1099_eligible BOOLEAN DEFAULT false,
        tax_id VARCHAR(50),
        default_expense_account_id UUID,
        business_id_number VARCHAR(50),
        payment_terms VARCHAR(20) DEFAULT ''net_30'',
        custom_payment_days INTEGER,
        preferred_payment_method VARCHAR(20),
        opening_balance DECIMAL(19,4) DEFAULT 0,
        opening_balance_date DATE,
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        custom_fields JSONB DEFAULT ''{}'',
        current_balance DECIMAL(19,4) DEFAULT 0,
        overdue_balance DECIMAL(19,4) DEFAULT 0,
        ytd_payments DECIMAL(19,4) DEFAULT 0,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Products & Services
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100) UNIQUE,
        type VARCHAR(20) NOT NULL CHECK (type IN (''inventory'', ''non_inventory'', ''service'', ''bundle'')),
        sale_description TEXT,
        purchase_description TEXT,
        category_id UUID,
        sale_price DECIMAL(19,4) DEFAULT 0,
        purchase_cost DECIMAL(19,4) DEFAULT 0,
        income_account_id UUID,
        expense_account_id UUID,
        asset_account_id UUID,
        tax_code_id UUID,
        is_active BOOLEAN DEFAULT true,
        images JSONB DEFAULT ''[]'',
        quantity_on_hand INTEGER DEFAULT 0,
        quantity_on_order INTEGER DEFAULT 0,
        reorder_point INTEGER,
        preferred_vendor_id UUID,
        barcode VARCHAR(255),
        price_tiers JSONB DEFAULT ''[]'',
        bundle_items JSONB DEFAULT ''[]'',
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Invoices
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.invoices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        invoice_number VARCHAR(50) NOT NULL,
        customer_id UUID NOT NULL,
        invoice_date DATE NOT NULL,
        due_date DATE NOT NULL,
        po_number VARCHAR(50),
        status VARCHAR(20) DEFAULT ''draft'' CHECK (status IN (''draft'', ''sent'', ''viewed'', ''partially_paid'', ''paid'', ''overdue'', ''voided'', ''written_off'')),
        currency VARCHAR(3) DEFAULT ''AED'',
        exchange_rate DECIMAL(19,6) DEFAULT 1,
        subtotal DECIMAL(19,4) DEFAULT 0,
        discount_type VARCHAR(10),
        discount_value DECIMAL(19,4),
        discount_amount DECIMAL(19,4) DEFAULT 0,
        tax_amount DECIMAL(19,4) DEFAULT 0,
        shipping_amount DECIMAL(19,4) DEFAULT 0,
        total_amount DECIMAL(19,4) DEFAULT 0,
        amount_paid DECIMAL(19,4) DEFAULT 0,
        balance_due DECIMAL(19,4) DEFAULT 0,
        deposit_amount DECIMAL(19,4),
        memo TEXT,
        private_notes TEXT,
        email_status VARCHAR(10),
        online_payment_enabled BOOLEAN DEFAULT true,
        payment_link VARCHAR(500),
        recurring_template_id UUID,
        estimate_id UUID,
        project_id UUID,
        class_id UUID,
        location_id UUID,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Invoice Line Items
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.invoice_line_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        invoice_id UUID NOT NULL,
        product_id UUID,
        description TEXT,
        quantity DECIMAL(19,4) DEFAULT 1,
        unit_rate DECIMAL(19,4) DEFAULT 0,
        amount DECIMAL(19,4) DEFAULT 0,
        tax_code_id UUID,
        tax_amount DECIMAL(19,4) DEFAULT 0,
        class_id UUID,
        location_id UUID,
        project_id UUID,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Estimates
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.estimates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        estimate_number VARCHAR(50) NOT NULL,
        customer_id UUID NOT NULL,
        estimate_date DATE NOT NULL,
        expiration_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT ''draft'' CHECK (status IN (''draft'', ''sent'', ''viewed'', ''accepted'', ''rejected'', ''expired'', ''converted'')),
        currency VARCHAR(3) DEFAULT ''AED'',
        exchange_rate DECIMAL(19,6) DEFAULT 1,
        subtotal DECIMAL(19,4) DEFAULT 0,
        discount_type VARCHAR(10),
        discount_value DECIMAL(19,4),
        discount_amount DECIMAL(19,4) DEFAULT 0,
        tax_amount DECIMAL(19,4) DEFAULT 0,
        total_amount DECIMAL(19,4) DEFAULT 0,
        memo TEXT,
        private_notes TEXT,
        acceptance_signature TEXT,
        accepted_at TIMESTAMP WITH TIME ZONE,
        rejected_at TIMESTAMP WITH TIME ZONE,
        rejection_reason TEXT,
        converted_invoice_id UUID,
        project_id UUID,
        class_id UUID,
        location_id UUID,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Bills
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.bills (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        bill_number VARCHAR(50) NOT NULL,
        vendor_id UUID NOT NULL,
        bill_date DATE NOT NULL,
        due_date DATE NOT NULL,
        terms VARCHAR(20),
        status VARCHAR(20) DEFAULT ''open'' CHECK (status IN (''open'', ''partially_paid'', ''paid'', ''overdue'', ''voided'')),
        currency VARCHAR(3) DEFAULT ''AED'',
        exchange_rate DECIMAL(19,6) DEFAULT 1,
        subtotal DECIMAL(19,4) DEFAULT 0,
        tax_amount DECIMAL(19,4) DEFAULT 0,
        total_amount DECIMAL(19,4) DEFAULT 0,
        amount_paid DECIMAL(19,4) DEFAULT 0,
        balance_due DECIMAL(19,4) DEFAULT 0,
        memo TEXT,
        purchase_order_id UUID,
        approval_status VARCHAR(20) DEFAULT ''pending'',
        approved_by UUID,
        approved_at TIMESTAMP WITH TIME ZONE,
        project_id UUID,
        class_id UUID,
        location_id UUID,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Bill Line Items
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.bill_line_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        bill_id UUID NOT NULL,
        account_id UUID NOT NULL,
        description TEXT,
        amount DECIMAL(19,4) DEFAULT 0,
        tax_code_id UUID,
        tax_amount DECIMAL(19,4) DEFAULT 0,
        customer_id UUID,
        project_id UUID,
        class_id UUID,
        location_id UUID,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Expenses
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.expenses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        date DATE NOT NULL,
        payment_account_id UUID NOT NULL,
        payment_method VARCHAR(20),
        vendor_id UUID,
        total_amount DECIMAL(19,4) DEFAULT 0,
        currency VARCHAR(3) DEFAULT ''AED'',
        exchange_rate DECIMAL(19,6) DEFAULT 1,
        memo TEXT,
        is_billable BOOLEAN DEFAULT false,
        customer_id UUID,
        project_id UUID,
        class_id UUID,
        location_id UUID,
        ocr_data JSONB,
        expense_claim_id UUID,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Expense Line Items
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.expense_line_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        expense_id UUID NOT NULL,
        category_account_id UUID NOT NULL,
        description TEXT,
        amount DECIMAL(19,4) DEFAULT 0,
        tax_code_id UUID,
        tax_amount DECIMAL(19,4) DEFAULT 0,
        is_billable BOOLEAN DEFAULT false,
        customer_id UUID,
        project_id UUID,
        class_id UUID,
        location_id UUID,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Journal Entries
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.journal_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        entry_number VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        memo TEXT,
        is_adjusting BOOLEAN DEFAULT false,
        is_reversing BOOLEAN DEFAULT false,
        reversing_date DATE,
        reversed_entry_id UUID,
        recurring_template_id UUID,
        source_type VARCHAR(20),
        source_id UUID,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Journal Entry Lines
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.journal_entry_lines (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        journal_entry_id UUID NOT NULL,
        account_id UUID NOT NULL,
        debit_amount DECIMAL(19,4) DEFAULT 0,
        credit_amount DECIMAL(19,4) DEFAULT 0,
        description TEXT,
        customer_id UUID,
        vendor_id UUID,
        class_id UUID,
        location_id UUID,
        project_id UUID,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Bank Accounts
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.bank_accounts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        account_type VARCHAR(20) NOT NULL,
        account_number_encrypted VARCHAR(500),
        routing_number VARCHAR(20),
        institution_name VARCHAR(255),
        current_balance DECIMAL(19,4) DEFAULT 0,
        currency VARCHAR(3) DEFAULT ''AED'',
        is_connected BOOLEAN DEFAULT false,
        plaid_item_id VARCHAR(255),
        plaid_account_id VARCHAR(255),
        last_sync_at TIMESTAMP WITH TIME ZONE,
        chart_account_id UUID,
        is_active BOOLEAN DEFAULT true,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Bank Transactions
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.bank_transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        bank_account_id UUID NOT NULL,
        date DATE NOT NULL,
        description TEXT,
        amount DECIMAL(19,4) NOT NULL,
        type VARCHAR(10) NOT NULL CHECK (type IN (''debit'', ''credit'')),
        status VARCHAR(20) DEFAULT ''uncategorized'',
        matched_transaction_id UUID,
        matched_transaction_type VARCHAR(20),
        match_confidence VARCHAR(10),
        category_account_id UUID,
        vendor_id UUID,
        customer_id UUID,
        class_id UUID,
        location_id UUID,
        plaid_transaction_id VARCHAR(255),
        is_reconciled BOOLEAN DEFAULT false,
        reconciled_at TIMESTAMP WITH TIME ZONE,
        memo TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Bank Rules
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.bank_rules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        priority INTEGER DEFAULT 0,
        conditions JSONB NOT NULL,
        actions JSONB NOT NULL,
        auto_confirm BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_by UUID,
        updated_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Reconciliations
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.reconciliations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        bank_account_id UUID NOT NULL,
        statement_date DATE NOT NULL,
        statement_ending_balance DECIMAL(19,4) NOT NULL,
        beginning_balance DECIMAL(19,4) DEFAULT 0,
        cleared_deposits DECIMAL(19,4) DEFAULT 0,
        cleared_payments DECIMAL(19,4) DEFAULT 0,
        cleared_balance DECIMAL(19,4) DEFAULT 0,
        difference DECIMAL(19,4) DEFAULT 0,
        status VARCHAR(20) DEFAULT ''in_progress'',
        completed_at TIMESTAMP WITH TIME ZONE,
        completed_by UUID,
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Payments Received
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.payments_received (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id UUID NOT NULL,
        payment_date DATE NOT NULL,
        amount DECIMAL(19,4) NOT NULL,
        payment_method VARCHAR(20),
        reference_number VARCHAR(50),
        deposit_account_id UUID,
        memo TEXT,
        is_deposited BOOLEAN DEFAULT false,
        bank_deposit_id UUID,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Payment Allocations (invoice payments)
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.payment_allocations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        payment_id UUID NOT NULL,
        invoice_id UUID NOT NULL,
        amount DECIMAL(19,4) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Employees
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.employees (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        date_of_birth DATE,
        national_id_encrypted VARCHAR(500),
        address JSONB DEFAULT ''{}'',
        hire_date DATE NOT NULL,
        termination_date DATE,
        termination_reason TEXT,
        employment_type VARCHAR(20) DEFAULT ''full_time'',
        department VARCHAR(100),
        position VARCHAR(100),
        manager_id UUID,
        pay_type VARCHAR(10) DEFAULT ''salary'',
        pay_rate DECIMAL(19,4) DEFAULT 0,
        pay_schedule VARCHAR(20) DEFAULT ''monthly'',
        status VARCHAR(20) DEFAULT ''active'',
        filing_status VARCHAR(20),
        allowances INTEGER DEFAULT 0,
        direct_deposit_accounts JSONB DEFAULT ''[]'',
        user_id UUID,
        pto_balance DECIMAL(10,2) DEFAULT 0,
        pto_accrual_rate DECIMAL(10,4) DEFAULT 0,
        pto_max_balance DECIMAL(10,2) DEFAULT 0,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Pay Runs
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.pay_runs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        pay_period_start DATE NOT NULL,
        pay_period_end DATE NOT NULL,
        pay_date DATE NOT NULL,
        pay_schedule VARCHAR(20),
        status VARCHAR(20) DEFAULT ''draft'',
        total_gross_pay DECIMAL(19,4) DEFAULT 0,
        total_deductions DECIMAL(19,4) DEFAULT 0,
        total_net_pay DECIMAL(19,4) DEFAULT 0,
        total_employer_taxes DECIMAL(19,4) DEFAULT 0,
        total_employer_costs DECIMAL(19,4) DEFAULT 0,
        journal_entry_id UUID,
        processed_at TIMESTAMP WITH TIME ZONE,
        processed_by UUID,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Pay Run Items
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.pay_run_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        pay_run_id UUID NOT NULL,
        employee_id UUID NOT NULL,
        regular_hours DECIMAL(10,2) DEFAULT 0,
        overtime_hours DECIMAL(10,2) DEFAULT 0,
        regular_pay DECIMAL(19,4) DEFAULT 0,
        overtime_pay DECIMAL(19,4) DEFAULT 0,
        bonus_pay DECIMAL(19,4) DEFAULT 0,
        commission_pay DECIMAL(19,4) DEFAULT 0,
        reimbursements DECIMAL(19,4) DEFAULT 0,
        gross_pay DECIMAL(19,4) DEFAULT 0,
        federal_tax DECIMAL(19,4) DEFAULT 0,
        state_tax DECIMAL(19,4) DEFAULT 0,
        social_security DECIMAL(19,4) DEFAULT 0,
        medicare DECIMAL(19,4) DEFAULT 0,
        other_taxes DECIMAL(19,4) DEFAULT 0,
        pre_tax_deductions DECIMAL(19,4) DEFAULT 0,
        post_tax_deductions DECIMAL(19,4) DEFAULT 0,
        total_deductions DECIMAL(19,4) DEFAULT 0,
        net_pay DECIMAL(19,4) DEFAULT 0,
        employer_social_security DECIMAL(19,4) DEFAULT 0,
        employer_medicare DECIMAL(19,4) DEFAULT 0,
        employer_unemployment DECIMAL(19,4) DEFAULT 0,
        employer_other_taxes DECIMAL(19,4) DEFAULT 0,
        total_employer_costs DECIMAL(19,4) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Time Entries
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.time_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL,
        customer_id UUID,
        project_id UUID,
        service_item_id UUID,
        date DATE NOT NULL,
        hours DECIMAL(10,2) NOT NULL,
        start_time TIME,
        end_time TIME,
        description TEXT,
        is_billable BOOLEAN DEFAULT true,
        billable_rate DECIMAL(19,4),
        cost_rate DECIMAL(19,4),
        is_invoiced BOOLEAN DEFAULT false,
        invoice_id UUID,
        is_approved BOOLEAN DEFAULT false,
        approved_by UUID,
        approved_at TIMESTAMP WITH TIME ZONE,
        timesheet_id UUID,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Projects
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.projects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        customer_id UUID NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT ''in_progress'',
        start_date DATE,
        end_date DATE,
        budget_type VARCHAR(10),
        revenue_budget DECIMAL(19,4),
        cost_budget DECIMAL(19,4),
        project_manager_id UUID,
        total_income DECIMAL(19,4) DEFAULT 0,
        total_costs DECIMAL(19,4) DEFAULT 0,
        labor_costs DECIMAL(19,4) DEFAULT 0,
        expense_costs DECIMAL(19,4) DEFAULT 0,
        gross_profit DECIMAL(19,4) DEFAULT 0,
        profit_margin DECIMAL(10,2) DEFAULT 0,
        template_id UUID,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Tax Rates
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.tax_rates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        rate DECIMAL(10,4) NOT NULL,
        tax_agency VARCHAR(255),
        tax_type VARCHAR(20) DEFAULT ''vat'',
        effective_date DATE NOT NULL,
        is_compound BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Tax Groups
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.tax_groups (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        tax_rate_ids JSONB DEFAULT ''[]'',
        combined_rate DECIMAL(10,4) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Budgets
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.budgets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        fiscal_year INTEGER NOT NULL,
        version VARCHAR(50) DEFAULT ''v1'',
        status VARCHAR(20) DEFAULT ''draft'',
        class_id UUID,
        location_id UUID,
        total_amount DECIMAL(19,4) DEFAULT 0,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Budget Lines
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.budget_lines (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        budget_id UUID NOT NULL,
        account_id UUID NOT NULL,
        month_1 DECIMAL(19,4) DEFAULT 0,
        month_2 DECIMAL(19,4) DEFAULT 0,
        month_3 DECIMAL(19,4) DEFAULT 0,
        month_4 DECIMAL(19,4) DEFAULT 0,
        month_5 DECIMAL(19,4) DEFAULT 0,
        month_6 DECIMAL(19,4) DEFAULT 0,
        month_7 DECIMAL(19,4) DEFAULT 0,
        month_8 DECIMAL(19,4) DEFAULT 0,
        month_9 DECIMAL(19,4) DEFAULT 0,
        month_10 DECIMAL(19,4) DEFAULT 0,
        month_11 DECIMAL(19,4) DEFAULT 0,
        month_12 DECIMAL(19,4) DEFAULT 0,
        annual_total DECIMAL(19,4) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Currencies
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.currencies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code VARCHAR(3) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        symbol VARCHAR(10) NOT NULL,
        decimal_places INTEGER DEFAULT 2,
        is_home_currency BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        latest_rate DECIMAL(19,6) DEFAULT 1,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Exchange Rates History
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.exchange_rates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        from_currency VARCHAR(3) NOT NULL,
        to_currency VARCHAR(3) NOT NULL,
        rate DECIMAL(19,6) NOT NULL,
        effective_date DATE NOT NULL,
        source VARCHAR(10) DEFAULT ''api'',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Classes (for tracking)
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.classes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        parent_class_id UUID,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Locations
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.locations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        address JSONB DEFAULT ''{}'',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Attachments (polymorphic)
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.attachments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        file_size INTEGER NOT NULL,
        storage_key VARCHAR(500) NOT NULL,
        uploaded_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Audit Logs (immutable)
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        user_id UUID,
        user_name VARCHAR(200),
        ip_address VARCHAR(45),
        action VARCHAR(10) NOT NULL CHECK (action IN (''create'', ''update'', ''delete'')),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        changes JSONB DEFAULT ''[]'',
        metadata JSONB DEFAULT ''{}''
    )', schema_name);

    -- Recurring Templates
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.recurring_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        template_type VARCHAR(20) NOT NULL,
        customer_id UUID,
        vendor_id UUID,
        frequency VARCHAR(20) NOT NULL,
        day_of_month INTEGER,
        start_date DATE NOT NULL,
        end_date DATE,
        max_occurrences INTEGER,
        occurrences_generated INTEGER DEFAULT 0,
        auto_send BOOLEAN DEFAULT false,
        days_before_due_date INTEGER DEFAULT 0,
        is_paused BOOLEAN DEFAULT false,
        next_generation_date DATE,
        template_data JSONB NOT NULL,
        created_by UUID,
        updated_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Notifications
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        link VARCHAR(500),
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Purchase Orders
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.purchase_orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        po_number VARCHAR(50) NOT NULL,
        vendor_id UUID NOT NULL,
        po_date DATE NOT NULL,
        expected_delivery_date DATE,
        shipping_terms VARCHAR(100),
        status VARCHAR(20) DEFAULT ''open'',
        subtotal DECIMAL(19,4) DEFAULT 0,
        tax_amount DECIMAL(19,4) DEFAULT 0,
        total_amount DECIMAL(19,4) DEFAULT 0,
        memo TEXT,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Purchase Order Line Items
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.purchase_order_line_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        purchase_order_id UUID NOT NULL,
        product_id UUID,
        description TEXT,
        quantity DECIMAL(19,4) DEFAULT 1,
        unit_rate DECIMAL(19,4) DEFAULT 0,
        amount DECIMAL(19,4) DEFAULT 0,
        quantity_received DECIMAL(19,4) DEFAULT 0,
        tax_code_id UUID,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Mileage Entries
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.mileage_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        date DATE NOT NULL,
        start_location VARCHAR(255),
        end_location VARCHAR(255),
        distance DECIMAL(10,2) NOT NULL,
        unit VARCHAR(5) DEFAULT ''km'',
        rate_per_unit DECIMAL(10,4),
        total_amount DECIMAL(19,4) DEFAULT 0,
        purpose TEXT,
        vehicle VARCHAR(100),
        is_billable BOOLEAN DEFAULT false,
        customer_id UUID,
        project_id UUID,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Expense Claims
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.expense_claims (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT ''draft'',
        total_amount DECIMAL(19,4) DEFAULT 0,
        submitted_at TIMESTAMP WITH TIME ZONE,
        reviewed_by UUID,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        review_comments TEXT,
        reimbursed_at TIMESTAMP WITH TIME ZONE,
        reimbursement_payment_id UUID,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Inventory Adjustments
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.inventory_adjustments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        date DATE NOT NULL,
        product_id UUID NOT NULL,
        location_id UUID,
        quantity_change INTEGER NOT NULL,
        new_quantity INTEGER NOT NULL,
        adjustment_account_id UUID NOT NULL,
        reason_code VARCHAR(20) NOT NULL,
        reference VARCHAR(100),
        memo TEXT,
        created_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- VAT Returns
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.vat_returns (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        status VARCHAR(20) DEFAULT ''draft'',
        output_tax DECIMAL(19,4) DEFAULT 0,
        input_tax DECIMAL(19,4) DEFAULT 0,
        net_tax DECIMAL(19,4) DEFAULT 0,
        standard_rated_sales DECIMAL(19,4) DEFAULT 0,
        zero_rated_sales DECIMAL(19,4) DEFAULT 0,
        exempt_sales DECIMAL(19,4) DEFAULT 0,
        standard_rated_purchases DECIMAL(19,4) DEFAULT 0,
        filed_at TIMESTAMP WITH TIME ZONE,
        filed_by UUID,
        reference_number VARCHAR(100),
        created_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Bill Payments
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.bill_payments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        vendor_id UUID NOT NULL,
        payment_date DATE NOT NULL,
        amount DECIMAL(19,4) NOT NULL,
        payment_method VARCHAR(20),
        reference_number VARCHAR(50),
        account_id UUID,
        memo TEXT,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Bill Payment Allocations
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.bill_payment_allocations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        bill_payment_id UUID NOT NULL,
        bill_id UUID NOT NULL,
        amount DECIMAL(19,4) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Timesheets
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.timesheets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL,
        week_start_date DATE NOT NULL,
        week_end_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT ''draft'',
        total_hours DECIMAL(10,2) DEFAULT 0,
        billable_hours DECIMAL(10,2) DEFAULT 0,
        non_billable_hours DECIMAL(10,2) DEFAULT 0,
        submitted_at TIMESTAMP WITH TIME ZONE,
        reviewed_by UUID,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        review_comments TEXT,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Credit Memos
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.credit_memos (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        credit_memo_number VARCHAR(50) NOT NULL,
        customer_id UUID NOT NULL,
        date DATE NOT NULL,
        invoice_id UUID,
        total_amount DECIMAL(19,4) DEFAULT 0,
        remaining_balance DECIMAL(19,4) DEFAULT 0,
        memo TEXT,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Vendor Credits
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.vendor_credits (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        vendor_id UUID NOT NULL,
        date DATE NOT NULL,
        total_amount DECIMAL(19,4) DEFAULT 0,
        remaining_balance DECIMAL(19,4) DEFAULT 0,
        memo TEXT,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Custom Fields
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.custom_fields (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        entity_type VARCHAR(50) NOT NULL,
        field_name VARCHAR(100) NOT NULL,
        field_type VARCHAR(20) NOT NULL,
        is_required BOOLEAN DEFAULT false,
        options JSONB DEFAULT ''[]'',
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Scheduled Reports
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.scheduled_reports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        report_config JSONB NOT NULL,
        frequency VARCHAR(20) NOT NULL,
        recipients JSONB DEFAULT ''[]'',
        format VARCHAR(10) DEFAULT ''pdf'',
        next_run_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Bank Deposits
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.bank_deposits (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        bank_account_id UUID NOT NULL,
        deposit_date DATE NOT NULL,
        total_amount DECIMAL(19,4) NOT NULL,
        memo TEXT,
        payment_ids JSONB DEFAULT ''[]'',
        created_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Product Categories
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.product_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        parent_category_id UUID,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Price History
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.price_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID NOT NULL,
        price DECIMAL(19,4) NOT NULL,
        effective_date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Assemblies (BOM)
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.assemblies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID NOT NULL,
        components JSONB DEFAULT ''[]'',
        assembly_cost DECIMAL(19,4) DEFAULT 0,
        created_by UUID,
        updated_by UUID,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Bill Approval Workflows
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.bill_approval_workflows (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        rules JSONB DEFAULT ''[]'',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Payment Reminders Config
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.payment_reminders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        stage VARCHAR(20) NOT NULL,
        days_offset INTEGER NOT NULL,
        email_template_subject VARCHAR(500),
        email_template_body TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', schema_name);

    -- Create indexes for tenant schema tables
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_customers_email ON %I.customers(email)', replace(schema_name, 'tenant_', ''), schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_customers_active ON %I.customers(is_active) WHERE is_deleted = false', replace(schema_name, 'tenant_', ''), schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_invoices_customer ON %I.invoices(customer_id)', replace(schema_name, 'tenant_', ''), schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_invoices_status ON %I.invoices(status)', replace(schema_name, 'tenant_', ''), schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_invoices_date ON %I.invoices(invoice_date)', replace(schema_name, 'tenant_', ''), schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_bills_vendor ON %I.bills(vendor_id)', replace(schema_name, 'tenant_', ''), schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_bills_status ON %I.bills(status)', replace(schema_name, 'tenant_', ''), schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_expenses_date ON %I.expenses(date)', replace(schema_name, 'tenant_', ''), schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_journal_entries_date ON %I.journal_entries(date)', replace(schema_name, 'tenant_', ''), schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_bank_txns_account ON %I.bank_transactions(bank_account_id)', replace(schema_name, 'tenant_', ''), schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_bank_txns_date ON %I.bank_transactions(date)', replace(schema_name, 'tenant_', ''), schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_time_entries_employee ON %I.time_entries(employee_id)', replace(schema_name, 'tenant_', ''), schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_time_entries_date ON %I.time_entries(date)', replace(schema_name, 'tenant_', ''), schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_projects_customer ON %I.projects(customer_id)', replace(schema_name, 'tenant_', ''), schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_audit_entity ON %I.audit_logs(entity_type, entity_id)', replace(schema_name, 'tenant_', ''), schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_audit_timestamp ON %I.audit_logs(timestamp)', replace(schema_name, 'tenant_', ''), schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_notifications_user ON %I.notifications(user_id, is_read)', replace(schema_name, 'tenant_', ''), schema_name);

END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
