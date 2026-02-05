// lib/crud/frameCrud.ts
import { SecurityService } from "@/lib/security/auth";
import pool from "@/lib/database/pool";

// Interfaz para marcos
export interface Frame {
  id: string;
  userId: number;
  name: string;
  style: string;
  description: string;
  price: string;
  imageUrl: string;
  purchaseLink: string;
  isActive: boolean;
  measurements: {
    width: string;
    height: string;
    bridge: string;
    temple: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Clase CRUD para marcos con PostgreSQL
export class FrameCRUD {
  private securityService: SecurityService;

  constructor() {
    this.securityService = SecurityService.getInstance();
  }

  // Crear nuevo marco
  public async createFrame(userId: number, frameData: any): Promise<any> {
    try {
      console.log("🗄️ FrameCRUD.createFrame - Iniciando...");
      console.log("🗄️ userId:", userId);
      console.log("🗄️ frameData:", frameData);

      const {
        name,
        style,
        description,
        price,
        image_url,
        purchase_link,
        is_active,
        width_mm,
        height_mm,
        bridge_mm,
        temple_mm,
      } = frameData;

      // Validar datos requeridos
      if (!name || !style) {
        throw new Error("Nombre y estilo son campos requeridos");
      }

      const query = `
      INSERT INTO frames (
        user_id, 
        name, 
        style, 
        description, 
        price, 
        image_url, 
        purchase_link, 
        is_active,
        width_mm,
        height_mm,
        bridge_mm,
        temple_mm,
        created_at, 
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `;

      const values = [
        userId,
        name,
        style,
        description || null,
        price || null,
        image_url || null,
        purchase_link || null,
        Boolean(is_active),
        // Convertir strings a números, o null si están vacíos
        width_mm ? parseInt(width_mm) || null : null,
        height_mm ? parseInt(height_mm) || null : null,
        bridge_mm ? parseInt(bridge_mm) || null : null,
        temple_mm ? parseInt(temple_mm) || null : null,
      ];

      console.log("🗄️ Query a ejecutar:", query);
      console.log("🗄️ Valores:", values);

      const result = await pool.query(query, values);

      console.log(
        "✅ FrameCRUD.createFrame - Éxito. Filas insertadas:",
        result.rows.length,
      );
      console.log("✅ Frame creado:", result.rows[0]);

      return result.rows[0];
    } catch (error: any) {
      console.error("❌ Error en FrameCRUD.createFrame:");
      console.error("❌ Mensaje:", error.message);
      console.error("❌ Código:", error.code);
      console.error("❌ Detalle:", error.detail);
      console.error("❌ Tabla:", error.table);
      console.error("❌ Columna:", error.column);
      console.error("❌ Restricción:", error.constraint);
      console.error("❌ Stack:", error.stack);

      // Re-lanzar el error para que frameService lo capture
      throw error;
    }
  }

  // Obtener marco por ID
  public async getFrameById(id: string): Promise<Frame | null> {
    const query = `
      SELECT * FROM frames WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return null;
    }
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      style: row.style,
      description: row.description,
      price: row.price,
      imageUrl: row.image_url,
      purchaseLink: row.purchase_link,
      isActive: row.is_active,
      measurements: {
        width: row.width_mm,
        height: row.height_mm,
        bridge: row.bridge_mm,
        temple: row.temple_mm,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Obtener marcos por usuario
  public async getFramesByUser(userId: number): Promise<any[]> {
    try {
      const query = `
      SELECT 
        id, 
        user_id, 
        name, 
        style, 
        description, 
        price, 
        image_url,
        purchase_link,
        is_active,
        width_mm,
        height_mm,
        bridge_mm,
        temple_mm,
        created_at, 
        updated_at
      FROM frames 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

      const result = await pool.query(query, [userId]);
      console.log(
        `📊 FrameCRUD.getFramesByUser - Encontrados ${result.rows.length} marcos para usuario ${userId}`,
      );

      if (result.rows.length > 0) {
        console.log(
          "📊 Primer marco encontrado:",
          JSON.stringify(result.rows[0], null, 2),
        );
      }

      return result.rows;
    } catch (error) {
      console.error("Error al obtener marcos por usuario:", error);
      throw error;
    }
  }

  // Obtener marcos activos por usuario
  public async getActiveFramesByUser(userId: number): Promise<Frame[]> {
    const query = `
      SELECT * FROM frames 
      WHERE user_id = $1 AND is_active = true 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      style: row.style,
      description: row.description,
      price: row.price,
      imageUrl: row.image_url,
      purchaseLink: row.purchase_link,
      isActive: row.is_active,
      measurements: {
        width: row.width_mm,
        height: row.height_mm,
        bridge: row.bridge_mm,
        temple: row.temple_mm,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  // Actualizar marco
  public async updateFrame(
    id: string,
    userId: number,
    updateData: Partial<Frame>,
  ): Promise<Frame | null> {
    const client = await pool.connect();
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updateData.name) {
        updates.push(`name = $${paramIndex}`);
        values.push(this.securityService.sanitizeInput(updateData.name));
        paramIndex++;
      }
      if (updateData.style) {
        updates.push(`style = $${paramIndex}`);
        values.push(this.securityService.sanitizeInput(updateData.style));
        paramIndex++;
      }
      if (updateData.description) {
        updates.push(`description = $${paramIndex}`);
        values.push(this.securityService.sanitizeInput(updateData.description));
        paramIndex++;
      }
      if (updateData.price !== undefined) {
        updates.push(`price = $${paramIndex}`);
        values.push(updateData.price);
        paramIndex++;
      }
      if (updateData.imageUrl !== undefined) {
        updates.push(`image_url = $${paramIndex}`);
        values.push(updateData.imageUrl);
        paramIndex++;
      }
      if (updateData.purchaseLink !== undefined) {
        updates.push(`purchase_link = $${paramIndex}`);
        values.push(updateData.purchaseLink);
        paramIndex++;
      }
      if (updateData.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex}`);
        values.push(updateData.isActive);
        paramIndex++;
      }
      if (updateData.measurements) {
        if (updateData.measurements.width !== undefined) {
          updates.push(`width_mm = $${paramIndex}`);
          values.push(updateData.measurements.width);
          paramIndex++;
        }
        if (updateData.measurements.height !== undefined) {
          updates.push(`height_mm = $${paramIndex}`);
          values.push(updateData.measurements.height);
          paramIndex++;
        }
        if (updateData.measurements.bridge !== undefined) {
          updates.push(`bridge_mm = $${paramIndex}`);
          values.push(updateData.measurements.bridge);
          paramIndex++;
        }
        if (updateData.measurements.temple !== undefined) {
          updates.push(`temple_mm = $${paramIndex}`);
          values.push(updateData.measurements.temple);
          paramIndex++;
        }
      }

      if (updates.length === 0) {
        return await this.getFrameById(id);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id, userId);

      const query = `
        SELECT 
          id, 
          name, 
          style, 
          description, 
          price, 
          image_url,
          purchase_link,
          is_active,
          COALESCE(width_mm, '') as width_mm,
          COALESCE(height_mm, '') as height_mm,
          COALESCE(bridge_mm, '') as bridge_mm,
          COALESCE(temple_mm, '') as temple_mm
        FROM frames 
        WHERE user_id = $1
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        style: row.style,
        description: row.description,
        price: row.price,
        imageUrl: row.image_url,
        purchaseLink: row.purchase_link,
        isActive: row.is_active,
        measurements: {
          width: row.width_mm,
          height: row.height_mm,
          bridge: row.bridge_mm,
          temple: row.temple_mm,
        },
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } finally {
      client.release();
    }
  }

  // Eliminar marco
  public async deleteFrame(id: string, userId: number): Promise<boolean> {
    const query = `
      DELETE FROM frames 
      WHERE id = $1 AND user_id = $2
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rowCount > 0;
  }

  // Activar/desactivar marco
  public async toggleFrameStatus(
    id: string,
    userId: number,
  ): Promise<Frame | null> {
    const query = `
      UPDATE frames 
      SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [id, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      style: row.style,
      description: row.description,
      price: row.price,
      imageUrl: row.image_url,
      purchaseLink: row.purchase_link,
      isActive: row.is_active,
      measurements: {
        width: row.width_mm,
        height: row.height_mm,
        bridge: row.bridge_mm,
        temple: row.temple_mm,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Buscar marcos por nombre o estilo
  public async searchFrames(userId: number, query: string): Promise<Frame[]> {
    const searchQuery = `
      SELECT * FROM frames 
      WHERE user_id = $1 AND (
        LOWER(name) LIKE LOWER($2) OR 
        LOWER(style) LIKE LOWER($2) OR
        LOWER(description) LIKE LOWER($2)
      )
      ORDER BY created_at DESC
    `;

    const result = await pool.query(searchQuery, [userId, `%${query}%`]);
    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      style: row.style,
      description: row.description,
      price: row.price,
      imageUrl: row.image_url,
      purchaseLink: row.purchase_link,
      isActive: row.is_active,
      measurements: {
        width: row.width_mm,
        height: row.height_mm,
        bridge: row.bridge_mm,
        temple: row.temple_mm,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  // Obtener estadísticas de marcos
  public async getFrameStats(userId: number): Promise<{
    totalFrames: number;
    activeFrames: number;
    inactiveFrames: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive
      FROM frames 
      WHERE user_id = $1
    `;

    const result = await pool.query(query, [userId]);
    const row = result.rows[0];

    return {
      totalFrames: parseInt(row.total) || 0,
      activeFrames: parseInt(row.active) || 0,
      inactiveFrames: parseInt(row.inactive) || 0,
    };
  }
}

// Instancia única del CRUD de marcos
export const frameCRUD = new FrameCRUD();
