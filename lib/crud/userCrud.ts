// lib/crud/userCrud.ts
import { SecurityService, User, RegisterData } from "@/lib/security/auth";
import pool from "@/lib/database/pool";

// Clase CRUD para usuarios con PostgreSQL
export class UserCRUD {
  private securityService: SecurityService;

  constructor() {
    this.securityService = SecurityService.getInstance();
    // No inicializamos admin aquí porque ya existe en la BD
    this.verifyAdminExists();
  }

  // Verificar que el admin exista en la BD
  private async verifyAdminExists(): Promise<void> {
    try {
      const admin = await this.getUserByEmail("admin@optica.com");
      if (!admin) {
        console.warn("⚠️ Usuario admin no encontrado en la base de datos");
      }
    } catch (error) {
      console.error("Error verificando admin:", error);
    }
  }

  // Crear nuevo usuario
  public async createUser(
    userData: Partial<User> & { password: string },
  ): Promise<User> {
    const client = await pool.connect();
    try {
      const sanitizedData = {
        name: this.securityService.sanitizeInput(userData.name || ""),
        lastName: this.securityService.sanitizeInput(userData.lastName || ""),
        company: this.securityService.sanitizeInput(userData.company || ""),
        email: this.securityService.sanitizeInput(userData.email || ""),
      };

      if (!this.securityService.validateEmail(sanitizedData.email)) {
        throw new Error("Email inválido");
      }

      if (!this.securityService.validatePassword(userData.password)) {
        throw new Error(
          "La contraseña debe tener al menos 6 caracteres, incluyendo letras y números",
        );
      }

      // Verificar si el usuario ya existe
      const existingUser = await this.getUserByEmail(sanitizedData.email);
      if (existingUser) {
        throw new Error("El usuario ya existe");
      }

      // ❗ IMPORTANTE: El password ya viene hasheado de la API route
      const hashedPassword = userData.password;

      // Iniciar transacción
      await client.query("BEGIN");

      // Insertar usuario
      const userQuery = `
      INSERT INTO users (name, last_name, company, email, password_hash, role, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, name, last_name, company, email, role, is_active, created_at, updated_at
    `;
      const userValues = [
        sanitizedData.name,
        sanitizedData.lastName,
        sanitizedData.company,
        sanitizedData.email,
        hashedPassword, // ✅ Ya viene hasheado de la API
        userData.role || "user",
        userData.isActive !== undefined ? userData.isActive : true,
        new Date(),
        new Date(),
      ];

      const userResult = await client.query(userQuery, userValues);
      const newUser = userResult.rows[0];

      // Insertar suscripción
      const subscriptionQuery = `
      INSERT INTO subscriptions (user_id, plan, status, analysis_count, analysis_limit)
      VALUES ($1, $2, $3, $4, $5)
    `;
      const subscriptionValues = [
        newUser.id,
        userData.subscription?.plan || "free",
        userData.subscription?.status || "trial",
        userData.subscription?.analysisCount || 0,
        userData.subscription?.analysisLimit || 5,
      ];

      await client.query(subscriptionQuery, subscriptionValues);

      await client.query("COMMIT");

      // Formatear el usuario para devolverlo
      const user: User = {
        id: newUser.id,
        name: newUser.name,
        lastName: newUser.last_name,
        company: newUser.company,
        email: newUser.email,
        password: hashedPassword,
        role: newUser.role,
        isActive: newUser.is_active,
        subscription: {
          plan: userData.subscription?.plan || "free",
          status: userData.subscription?.status || "trial",
          analysisCount: userData.subscription?.analysisCount || 0,
          analysisLimit: userData.subscription?.analysisLimit || 5,
        },
        createdAt: newUser.created_at,
        updatedAt: newUser.updated_at,
      };

      return user;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Obtener usuario por ID
  public async getUserById(id: number): Promise<User | null> {
    const query = `
      SELECT u.*, s.plan, s.status, s.analysis_count, s.analysis_limit, s.next_billing_date
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE u.id = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return null;
    }
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      lastName: row.last_name,
      company: row.company,
      email: row.email,
      password: row.password_hash,
      role: row.role,
      isActive: row.is_active,
      subscription: {
        plan: row.plan,
        status: row.status,
        analysisCount: row.analysis_count,
        analysisLimit: row.analysis_limit,
        nextBilling: row.next_billing_date
          ? row.next_billing_date.toISOString()
          : undefined,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Obtener usuario por email
  public async getUserByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT u.*, s.plan, s.status, s.analysis_count, s.analysis_limit, s.next_billing_date
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE u.email = $1
    `;
    const result = await pool.query(query, [email]);
    if (result.rows.length === 0) {
      return null;
    }
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      lastName: row.last_name,
      company: row.company,
      email: row.email,
      password: row.password_hash,
      role: row.role,
      isActive: row.is_active,
      subscription: {
        plan: row.plan,
        status: row.status,
        analysisCount: row.analysis_count,
        analysisLimit: row.analysis_limit,
        nextBilling: row.next_billing_date
          ? row.next_billing_date.toISOString()
          : undefined,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Obtener todos los usuarios
  public async getAllUsers(): Promise<User[]> {
    const query = `
      SELECT u.*, s.plan, s.status, s.analysis_count, s.analysis_limit, s.next_billing_date
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      ORDER BY u.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      lastName: row.last_name,
      company: row.company,
      email: row.email,
      password: row.password_hash,
      role: row.role,
      isActive: row.is_active,
      subscription: {
        plan: row.plan,
        status: row.status,
        analysisCount: row.analysis_count,
        analysisLimit: row.analysis_limit,
        nextBilling: row.next_billing_date
          ? row.next_billing_date.toISOString()
          : undefined,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  // Actualizar usuario
  public async updateUser(
    id: number,
    updateData: Partial<User>,
  ): Promise<User | null> {
    const client = await pool.connect();
    try {
      const sanitizedData: any = {};
      if (updateData.name)
        sanitizedData.name = this.securityService.sanitizeInput(
          updateData.name,
        );
      if (updateData.lastName)
        sanitizedData.lastName = this.securityService.sanitizeInput(
          updateData.lastName,
        );
      if (updateData.company)
        sanitizedData.company = this.securityService.sanitizeInput(
          updateData.company,
        );
      if (updateData.email) {
        sanitizedData.email = this.securityService.sanitizeInput(
          updateData.email,
        );
        if (!this.securityService.validateEmail(sanitizedData.email)) {
          throw new Error("Email inválido");
        }
      }

      // Construir la consulta dinámicamente
      const setClause = Object.keys(sanitizedData)
        .map((key, index) => {
          const dbKey = key === "lastName" ? "last_name" : key;
          return `${dbKey} = $${index + 1}`;
        })
        .join(", ");

      if (setClause) {
        const values = Object.values(sanitizedData);
        values.push(id);

        const query = `
          UPDATE users 
          SET ${setClause}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${values.length}
          RETURNING *
        `;

        const result = await client.query(query, values);
        if (result.rows.length === 0) {
          return null;
        }

        // Si hay datos de suscripción para actualizar
        if (updateData.subscription) {
          const subQuery = `
            UPDATE subscriptions 
            SET plan = $1, status = $2, analysis_count = $3, analysis_limit = $4,
                next_billing_date = $5, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $6
          `;
          const subValues = [
            updateData.subscription.plan,
            updateData.subscription.status,
            updateData.subscription.analysisCount,
            updateData.subscription.analysisLimit,
            updateData.subscription.nextBilling
              ? new Date(updateData.subscription.nextBilling)
              : null,
            id,
          ];
          await client.query(subQuery, subValues);
        }

        // Obtener el usuario actualizado
        return await this.getUserById(id);
      }

      return null;
    } finally {
      client.release();
    }
  }

  // Actualizar contraseña del usuario
  public async updatePassword(
    id: number,
    newPassword: string,
  ): Promise<boolean> {
    if (!this.securityService.validatePassword(newPassword)) {
      throw new Error(
        "La contraseña debe tener al menos 6 caracteres, incluyendo letras y números",
      );
    }

    const hashedPassword = await this.securityService.hashPassword(newPassword);

    const query = `
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    const result = await pool.query(query, [hashedPassword, id]);
    return result.rowCount > 0;
  }

  // Cambiar plan de suscripción
  public async changePlan(
    id: number,
    newPlan: User["subscription"]["plan"],
  ): Promise<User | null> {
    const client = await pool.connect();
    try {
      const planDetails = {
        free: { analysisLimit: 5 },
        basic: { analysisLimit: 15 },
        pro: { analysisLimit: 50 },
        enterprise: { analysisLimit: 9999 },
      };

      const nextBilling = new Date();
      nextBilling.setMonth(nextBilling.getMonth() + 1);

      const query = `
        UPDATE subscriptions 
        SET plan = $1, analysis_limit = $2, status = 'active',
            next_billing_date = $3, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $4
      `;

      await client.query(query, [
        newPlan,
        planDetails[newPlan]?.analysisLimit || 5,
        nextBilling,
        id,
      ]);

      // Actualizar también la fecha de actualización del usuario
      await client.query(
        `
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1
      `,
        [id],
      );

      return await this.getUserById(id);
    } finally {
      client.release();
    }
  }

  // Incrementar contador de análisis
  public async incrementAnalysisCount(id: number): Promise<User | null> {
    const query = `
      UPDATE subscriptions 
      SET analysis_count = analysis_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return null;
    }

    // Actualizar también la fecha de actualización del usuario
    await pool.query(
      `
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1
    `,
      [id],
    );

    return await this.getUserById(id);
  }

  // Obtener estadísticas
  public async getStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalRevenue: number;
    totalAnalysis: number;
  }> {
    const usersQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
      FROM users
    `);

    const subscriptionQuery = await pool.query(`
      SELECT 
        SUM(s.analysis_count) as total_analysis,
        s.plan,
        COUNT(*) as plan_count
      FROM subscriptions s
      WHERE s.status = 'active'
      GROUP BY s.plan
    `);

    let totalRevenue = 0;
    let totalAnalysis = 0;

    const planPrices: { [key: string]: number } = {
      free: 0,
      basic: 19000,
      pro: 49000,
      enterprise: 199000,
    };

    subscriptionQuery.rows.forEach((row) => {
      totalAnalysis += parseInt(row.total_analysis) || 0;
      totalRevenue +=
        (planPrices[row.plan] || 0) * (parseInt(row.plan_count) || 0);
    });

    return {
      totalUsers: parseInt(usersQuery.rows[0].total_users) || 0,
      activeUsers: parseInt(usersQuery.rows[0].active_users) || 0,
      totalRevenue,
      totalAnalysis,
    };
  }

  // Método para verificar credenciales (login)
  public async verifyCredentials(
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      return null;
    }

    const passwordValid = await this.securityService.verifyPassword(
      password,
      user.password,
    );
    if (!passwordValid) {
      return null;
    }

    return user;
  }

  // Buscar usuarios
  public async searchUsers(query: string): Promise<User[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    const searchQuery = `
      SELECT u.*, s.plan, s.status, s.analysis_count, s.analysis_limit, s.next_billing_date
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE 
        LOWER(u.name) LIKE $1 OR
        LOWER(u.last_name) LIKE $1 OR
        LOWER(u.email) LIKE $1 OR
        LOWER(u.company) LIKE $1
      ORDER BY u.created_at DESC
    `;

    const result = await pool.query(searchQuery, [searchTerm]);
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      lastName: row.last_name,
      company: row.company,
      email: row.email,
      password: row.password_hash,
      role: row.role,
      isActive: row.is_active,
      subscription: {
        plan: row.plan,
        status: row.status,
        analysisCount: row.analysis_count,
        analysisLimit: row.analysis_limit,
        nextBilling: row.next_billing_date
          ? row.next_billing_date.toISOString()
          : undefined,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  // Obtener usuarios con filtros
  public async getUsersWithFilters(filters: {
    role?: string;
    isActive?: boolean;
    subscriptionPlan?: string;
  }): Promise<User[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.role) {
      conditions.push(`u.role = $${paramIndex}`);
      values.push(filters.role);
      paramIndex++;
    }

    if (filters.isActive !== undefined) {
      conditions.push(`u.is_active = $${paramIndex}`);
      values.push(filters.isActive);
      paramIndex++;
    }

    if (filters.subscriptionPlan) {
      conditions.push(`s.plan = $${paramIndex}`);
      values.push(filters.subscriptionPlan);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT u.*, s.plan, s.status, s.analysis_count, s.analysis_limit, s.next_billing_date
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      ${whereClause}
      ORDER BY u.created_at DESC
    `;

    const result = await pool.query(query, values);
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      lastName: row.last_name,
      company: row.company,
      email: row.email,
      password: row.password_hash,
      role: row.role,
      isActive: row.is_active,
      subscription: {
        plan: row.plan,
        status: row.status,
        analysisCount: row.analysis_count,
        analysisLimit: row.analysis_limit,
        nextBilling: row.next_billing_date
          ? row.next_billing_date.toISOString()
          : undefined,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  // Activar/desactivar usuario
  public async toggleUserStatus(id: number): Promise<User | null> {
    const query = `
      UPDATE users 
      SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return await this.getUserById(id);
  }

  // Eliminar usuario (soft delete)
  public async deleteUser(id: number): Promise<boolean> {
    const query = `
      UPDATE users 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }
}

// Instancia única del CRUD
export const userCRUD = new UserCRUD();
