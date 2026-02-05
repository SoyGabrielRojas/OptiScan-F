// lib/services/frameService.ts
import { frameCRUD } from "@/lib/crud/frameCrud";
import { authService } from "@/lib/services/authService";

export class FrameService {
  // Obtener marcos del usuario actual
  public async getUserFrames(userId: number): Promise<{
    success: boolean;
    frames?: any[];
    message?: string;
  }> {
    try {
      const frames = await frameCRUD.getFramesByUser(userId);
      return {
        success: true,
        frames,
      };
    } catch (error) {
      console.error("Error al obtener marcos:", error);
      return {
        success: false,
        message: "Error al obtener marcos",
      };
    }
  }

  // Obtener marcos activos del usuario
  public async getActiveFrames(userId: number): Promise<{
    success: boolean;
    frames?: any[];
    message?: string;
  }> {
    try {
      const frames = await frameCRUD.getActiveFramesByUser(userId);
      return {
        success: true,
        frames,
      };
    } catch (error) {
      console.error("Error al obtener marcos activos:", error);
      return {
        success: false,
        message: "Error al obtener marcos activos",
      };
    }
  }

  // Crear nuevo marco
  public async createFrame(
    userId: number,
    frameData: any,
  ): Promise<{
    success: boolean;
    frame?: any;
    message?: string;
    error?: string;
    validationErrors?: any[];
  }> {
    try {
      console.log("🛠️ FrameService.createFrame - userId:", userId);
      console.log("🛠️ FrameService.createFrame - frameData:", frameData);

      // Validaciones adicionales
      const validationErrors = [];

      if (!frameData.name) {
        validationErrors.push({
          field: "name",
          message: "El nombre es obligatorio",
        });
      }

      if (!frameData.style) {
        validationErrors.push({
          field: "style",
          message: "El estilo/tipo de rostro es obligatorio",
        });
      }

      if (validationErrors.length > 0) {
        return {
          success: false,
          message: "Errores de validación",
          validationErrors,
        };
      }

      const frame = await frameCRUD.createFrame(userId, frameData);

      console.log("✅ FrameService.createFrame - Resultado exitoso:", frame);

      return {
        success: true,
        frame,
      };
    } catch (error: any) {
      console.error("❌ Error en FrameService.createFrame:", error);
      console.error("❌ Stack trace:", error.stack);

      // Determinar el tipo de error
      let errorMessage = error.message || "Error al crear marco";

      // Si es un error de base de datos, dar más detalles
      if (error.code) {
        console.error("❌ Error code:", error.code);
        console.error("❌ Error detail:", error.detail);
        console.error("❌ Error hint:", error.hint);
      }

      return {
        success: false,
        message: errorMessage,
        error: error.message,
        details:
          process.env.NODE_ENV === "development"
            ? {
                code: error.code,
                detail: error.detail,
                hint: error.hint,
                stack: error.stack,
              }
            : undefined,
      };
    }
  }

  // Actualizar marco
  public async updateFrame(
    frameId: string,
    userId: number,
    frameData: any,
  ): Promise<{
    success: boolean;
    frame?: any;
    message?: string;
  }> {
    try {
      const frame = await frameCRUD.updateFrame(frameId, userId, frameData);
      if (!frame) {
        return {
          success: false,
          message: "Marco no encontrado o no tienes permisos",
        };
      }

      return {
        success: true,
        frame,
      };
    } catch (error: any) {
      console.error("Error al actualizar marco:", error);
      return {
        success: false,
        message: error.message || "Error al actualizar marco",
      };
    }
  }

  // Eliminar marco
  public async deleteFrame(
    frameId: string,
    userId: number,
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const deleted = await frameCRUD.deleteFrame(frameId, userId);
      if (!deleted) {
        return {
          success: false,
          message: "Marco no encontrado o no tienes permisos",
        };
      }

      return {
        success: true,
        message: "Marco eliminado correctamente",
      };
    } catch (error) {
      console.error("Error al eliminar marco:", error);
      return {
        success: false,
        message: "Error al eliminar marco",
      };
    }
  }

  // Activar/desactivar marco
  public async toggleFrameStatus(
    frameId: string,
    userId: number,
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const frame = await frameCRUD.toggleFrameStatus(frameId, userId);
      if (!frame) {
        return {
          success: false,
          message: "Marco no encontrado o no tienes permisos",
        };
      }

      return {
        success: true,
        message: `Marco ${frame.isActive ? "activado" : "desactivado"} correctamente`,
      };
    } catch (error) {
      console.error("Error al cambiar estado del marco:", error);
      return {
        success: false,
        message: "Error al cambiar estado del marco",
      };
    }
  }

  // Buscar marcos
  public async searchFrames(
    userId: number,
    query: string,
  ): Promise<{
    success: boolean;
    frames?: any[];
    message?: string;
  }> {
    try {
      const frames = await frameCRUD.searchFrames(userId, query);
      return {
        success: true,
        frames,
      };
    } catch (error) {
      console.error("Error al buscar marcos:", error);
      return {
        success: false,
        message: "Error al buscar marcos",
      };
    }
  }

  // Obtener estadísticas de marcos
  public async getFrameStats(userId: number): Promise<{
    success: boolean;
    stats?: any;
    message?: string;
  }> {
    try {
      const stats = await frameCRUD.getFrameStats(userId);
      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error("Error al obtener estadísticas de marcos:", error);
      return {
        success: false,
        message: "Error al obtener estadísticas",
      };
    }
  }
}

// Instancia única del servicio de marcos
export const frameService = new FrameService();
