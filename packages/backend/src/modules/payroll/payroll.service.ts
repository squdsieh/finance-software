import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { paginate } from '../../utils/pagination';
import { ServiceContext } from '../../types';

export class PayrollService {
  private db = getDatabase();

  async listEmployees(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('employees').where({ is_deleted: false });
    if (options.status) query = query.where({ status: options.status });
    if (options.department) query = query.where({ department_id: options.department });
    return paginate(query, {
      page: parseInt(options.page) || 1, limit: parseInt(options.limit) || 25,
      sortBy: 'last_name', sortOrder: 'asc',
    });
  }

  async getEmployee(schema: string, id: string) {
    const employee = await this.db.withSchema(schema).table('employees').where({ id, is_deleted: false }).first();
    if (!employee) throw new AppError('Employee not found', 404);
    const salaryHistory = await this.db.withSchema(schema).table('employee_salary_history')
      .where({ employee_id: id }).orderBy('effective_date', 'desc');
    const deductions = await this.db.withSchema(schema).table('employee_deductions')
      .where({ employee_id: id, is_active: true });
    const benefits = await this.db.withSchema(schema).table('employee_benefits')
      .where({ employee_id: id, is_active: true });
    return { ...employee, salaryHistory, deductions, benefits };
  }

  async createEmployee(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('employees').insert({
      id, employee_number: data.employeeNumber || `EMP-${Date.now()}`,
      first_name: data.firstName, last_name: data.lastName, email: data.email,
      phone: data.phone, hire_date: data.hireDate, department_id: data.departmentId,
      position: data.position, employment_type: data.employmentType || 'full_time',
      pay_frequency: data.payFrequency || 'monthly',
      basic_salary: data.basicSalary, housing_allowance: data.housingAllowance || 0,
      transport_allowance: data.transportAllowance || 0, other_allowances: data.otherAllowances || 0,
      bank_name: data.bankName, bank_account_number: data.bankAccountNumber,
      bank_iban: data.bankIban, nationality: data.nationality,
      visa_status: data.visaStatus, emirates_id: data.emiratesId,
      passport_number: data.passportNumber, status: 'active',
      created_by: ctx.userId, updated_by: ctx.userId,
    });

    // Record initial salary
    await this.db.withSchema(ctx.tenantSchema).table('employee_salary_history').insert({
      id: uuidv4(), employee_id: id, effective_date: data.hireDate,
      basic_salary: data.basicSalary, housing_allowance: data.housingAllowance || 0,
      transport_allowance: data.transportAllowance || 0, other_allowances: data.otherAllowances || 0,
      reason: 'Initial hire', created_by: ctx.userId,
    });

    return { id };
  }

  async updateEmployee(ctx: ServiceContext, id: string, data: any) {
    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };
    const fields = ['firstName', 'lastName', 'email', 'phone', 'position', 'departmentId',
      'employmentType', 'payFrequency', 'bankName', 'bankAccountNumber', 'bankIban'];
    const dbFields = ['first_name', 'last_name', 'email', 'phone', 'position', 'department_id',
      'employment_type', 'pay_frequency', 'bank_name', 'bank_account_number', 'bank_iban'];
    fields.forEach((f, i) => { if (data[f] !== undefined) updates[dbFields[i]] = data[f]; });

    // Handle salary change
    if (data.basicSalary !== undefined) {
      updates.basic_salary = data.basicSalary;
      if (data.housingAllowance !== undefined) updates.housing_allowance = data.housingAllowance;
      if (data.transportAllowance !== undefined) updates.transport_allowance = data.transportAllowance;
      if (data.otherAllowances !== undefined) updates.other_allowances = data.otherAllowances;
      await this.db.withSchema(ctx.tenantSchema).table('employee_salary_history').insert({
        id: uuidv4(), employee_id: id, effective_date: data.effectiveDate || new Date(),
        basic_salary: data.basicSalary, housing_allowance: data.housingAllowance || 0,
        transport_allowance: data.transportAllowance || 0, other_allowances: data.otherAllowances || 0,
        reason: data.salaryChangeReason || 'Salary adjustment', created_by: ctx.userId,
      });
    }

    await this.db.withSchema(ctx.tenantSchema).table('employees').where({ id }).update(updates);
    return { id };
  }

  async deleteEmployee(ctx: ServiceContext, id: string) {
    await this.db.withSchema(ctx.tenantSchema).table('employees').where({ id }).update({
      is_deleted: true, updated_at: new Date(), updated_by: ctx.userId,
    });
  }

  async terminateEmployee(ctx: ServiceContext, id: string, data: any) {
    await this.db.withSchema(ctx.tenantSchema).table('employees').where({ id }).update({
      status: 'terminated', termination_date: data.terminationDate,
      termination_reason: data.reason, updated_at: new Date(), updated_by: ctx.userId,
    });
  }

  async listPayRuns(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('pay_runs');
    if (options.status) query = query.where({ status: options.status });
    return paginate(query, {
      page: parseInt(options.page) || 1, limit: parseInt(options.limit) || 25,
      sortBy: 'pay_period_end', sortOrder: 'desc',
    });
  }

  async getPayRun(schema: string, id: string) {
    const payRun = await this.db.withSchema(schema).table('pay_runs').where({ id }).first();
    if (!payRun) throw new AppError('Pay run not found', 404);
    const payslips = await this.db.withSchema(schema).table('payslips')
      .where({ pay_run_id: id })
      .join('employees', 'payslips.employee_id', 'employees.id')
      .select('payslips.*', 'employees.first_name', 'employees.last_name', 'employees.employee_number');
    return { ...payRun, payslips };
  }

  async createPayRun(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('pay_runs').insert({
      id, pay_period_start: data.payPeriodStart, pay_period_end: data.payPeriodEnd,
      payment_date: data.paymentDate, pay_frequency: data.payFrequency || 'monthly',
      status: 'draft', notes: data.notes, created_by: ctx.userId, updated_by: ctx.userId,
    });
    return { id };
  }

  async updatePayRun(ctx: ServiceContext, id: string, data: any) {
    const payRun = await this.db.withSchema(ctx.tenantSchema).table('pay_runs').where({ id }).first();
    if (!payRun) throw new AppError('Pay run not found', 404);
    if (payRun.status === 'processed') throw new AppError('Cannot update processed pay run', 400);
    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };
    if (data.paymentDate) updates.payment_date = data.paymentDate;
    if (data.notes) updates.notes = data.notes;
    await this.db.withSchema(ctx.tenantSchema).table('pay_runs').where({ id }).update(updates);
    return { id };
  }

  async calculatePayRun(ctx: ServiceContext, payRunId: string) {
    const payRun = await this.db.withSchema(ctx.tenantSchema).table('pay_runs').where({ id: payRunId }).first();
    if (!payRun) throw new AppError('Pay run not found', 404);
    if (payRun.status === 'processed') throw new AppError('Pay run already processed', 400);

    // Delete existing payslips for recalculation
    await this.db.withSchema(ctx.tenantSchema).table('payslips').where({ pay_run_id: payRunId }).del();

    const employees = await this.db.withSchema(ctx.tenantSchema).table('employees')
      .where({ status: 'active', pay_frequency: payRun.pay_frequency, is_deleted: false });

    let totalGross = 0, totalNet = 0, totalDeductions = 0;
    for (const emp of employees) {
      const grossSalary = parseFloat(emp.basic_salary) + parseFloat(emp.housing_allowance || 0)
        + parseFloat(emp.transport_allowance || 0) + parseFloat(emp.other_allowances || 0);

      // Get employee deductions
      const deductions = await this.db.withSchema(ctx.tenantSchema).table('employee_deductions')
        .where({ employee_id: emp.id, is_active: true });

      let totalEmpDeductions = 0;
      const deductionDetails: any[] = [];
      for (const ded of deductions) {
        let amount = 0;
        if (ded.calculation_type === 'fixed') {
          amount = parseFloat(ded.amount);
        } else if (ded.calculation_type === 'percentage') {
          amount = grossSalary * (parseFloat(ded.percentage) / 100);
        }
        totalEmpDeductions += amount;
        deductionDetails.push({ name: ded.name, type: ded.deduction_type, amount });
      }

      const netSalary = grossSalary - totalEmpDeductions;

      await this.db.withSchema(ctx.tenantSchema).table('payslips').insert({
        id: uuidv4(), pay_run_id: payRunId, employee_id: emp.id,
        basic_salary: emp.basic_salary, housing_allowance: emp.housing_allowance || 0,
        transport_allowance: emp.transport_allowance || 0, other_allowances: emp.other_allowances || 0,
        gross_salary: grossSalary, total_deductions: totalEmpDeductions, net_salary: netSalary,
        deduction_details: JSON.stringify(deductionDetails),
      });

      totalGross += grossSalary;
      totalNet += netSalary;
      totalDeductions += totalEmpDeductions;
    }

    await this.db.withSchema(ctx.tenantSchema).table('pay_runs').where({ id: payRunId }).update({
      total_gross: totalGross, total_deductions: totalDeductions, total_net: totalNet,
      employee_count: employees.length, status: 'calculated', updated_at: new Date(), updated_by: ctx.userId,
    });

    return { employeeCount: employees.length, totalGross, totalDeductions, totalNet };
  }

  async approvePayRun(ctx: ServiceContext, id: string) {
    const payRun = await this.db.withSchema(ctx.tenantSchema).table('pay_runs').where({ id }).first();
    if (!payRun) throw new AppError('Pay run not found', 404);
    if (payRun.status !== 'calculated') throw new AppError('Pay run must be calculated before approval', 400);
    await this.db.withSchema(ctx.tenantSchema).table('pay_runs').where({ id }).update({
      status: 'approved', approved_by: ctx.userId, approved_at: new Date(), updated_at: new Date(),
    });
  }

  async processPayRun(ctx: ServiceContext, id: string) {
    const payRun = await this.db.withSchema(ctx.tenantSchema).table('pay_runs').where({ id }).first();
    if (!payRun) throw new AppError('Pay run not found', 404);
    if (payRun.status !== 'approved') throw new AppError('Pay run must be approved before processing', 400);

    // Create journal entry for payroll
    const jeId = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('journal_entries').insert({
      id: jeId, entry_number: `PAY-${Date.now()}`, date: payRun.payment_date,
      memo: `Payroll: ${payRun.pay_period_start} to ${payRun.pay_period_end}`,
      source_type: 'payroll', source_id: id, status: 'posted',
      total_amount: payRun.total_gross, posted_at: new Date(),
      created_by: ctx.userId, updated_by: ctx.userId,
    });

    await this.db.withSchema(ctx.tenantSchema).table('pay_runs').where({ id }).update({
      status: 'processed', processed_at: new Date(), journal_entry_id: jeId,
      updated_at: new Date(), updated_by: ctx.userId,
    });
  }

  async listPayslips(schema: string, payRunId: string) {
    return this.db.withSchema(schema).table('payslips')
      .where({ pay_run_id: payRunId })
      .join('employees', 'payslips.employee_id', 'employees.id')
      .select('payslips.*', 'employees.first_name', 'employees.last_name', 'employees.employee_number');
  }

  async getPayslip(schema: string, payRunId: string, employeeId: string) {
    const payslip = await this.db.withSchema(schema).table('payslips')
      .where({ pay_run_id: payRunId, employee_id: employeeId })
      .join('employees', 'payslips.employee_id', 'employees.id')
      .select('payslips.*', 'employees.first_name', 'employees.last_name',
        'employees.employee_number', 'employees.bank_name', 'employees.bank_iban')
      .first();
    if (!payslip) throw new AppError('Payslip not found', 404);
    return payslip;
  }

  async listSalaryStructures(schema: string) {
    return this.db.withSchema(schema).table('salary_structures').where({ is_active: true }).orderBy('name');
  }

  async createSalaryStructure(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('salary_structures').insert({
      id, name: data.name, description: data.description,
      components: JSON.stringify(data.components || []),
      created_by: ctx.userId, updated_by: ctx.userId,
    });
    return { id };
  }

  async updateSalaryStructure(ctx: ServiceContext, id: string, data: any) {
    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };
    if (data.name) updates.name = data.name;
    if (data.description) updates.description = data.description;
    if (data.components) updates.components = JSON.stringify(data.components);
    await this.db.withSchema(ctx.tenantSchema).table('salary_structures').where({ id }).update(updates);
    return { id };
  }

  async listDeductionTypes(schema: string) {
    return this.db.withSchema(schema).table('deduction_types').where({ is_active: true }).orderBy('name');
  }

  async createDeductionType(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('deduction_types').insert({
      id, name: data.name, description: data.description,
      calculation_type: data.calculationType, default_amount: data.defaultAmount,
      default_percentage: data.defaultPercentage, is_pre_tax: data.isPreTax || false,
      created_by: ctx.userId,
    });
    return { id };
  }

  async listBenefitTypes(schema: string) {
    return this.db.withSchema(schema).table('benefit_types').where({ is_active: true }).orderBy('name');
  }

  async createBenefitType(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('benefit_types').insert({
      id, name: data.name, description: data.description,
      calculation_type: data.calculationType, default_amount: data.defaultAmount,
      is_taxable: data.isTaxable || false, created_by: ctx.userId,
    });
    return { id };
  }

  async payrollSummary(schema: string, options: any) {
    const query = this.db.withSchema(schema).table('pay_runs').where({ status: 'processed' });
    if (options.year) {
      query.whereRaw('EXTRACT(YEAR FROM payment_date) = ?', [options.year]);
    }
    const runs = await query.orderBy('payment_date', 'desc');
    const totals = runs.reduce(
      (acc: any, run: any) => ({
        totalGross: acc.totalGross + parseFloat(run.total_gross || 0),
        totalDeductions: acc.totalDeductions + parseFloat(run.total_deductions || 0),
        totalNet: acc.totalNet + parseFloat(run.total_net || 0),
      }),
      { totalGross: 0, totalDeductions: 0, totalNet: 0 }
    );
    return { runs, totals };
  }

  async taxWithholdings(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('payslips')
      .join('pay_runs', 'payslips.pay_run_id', 'pay_runs.id')
      .join('employees', 'payslips.employee_id', 'employees.id')
      .where({ 'pay_runs.status': 'processed' });
    if (options.year) {
      query = query.whereRaw('EXTRACT(YEAR FROM pay_runs.payment_date) = ?', [options.year]);
    }
    return query.select(
      'employees.id', 'employees.first_name', 'employees.last_name', 'employees.employee_number',
      this.db.raw('SUM(payslips.gross_salary) as total_gross'),
      this.db.raw('SUM(payslips.total_deductions) as total_deductions'),
      this.db.raw('SUM(payslips.net_salary) as total_net')
    ).groupBy('employees.id', 'employees.first_name', 'employees.last_name', 'employees.employee_number');
  }
}
