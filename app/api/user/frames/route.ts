// import { NextRequest, NextResponse } from 'next/server';
// import { authService } from '@/lib/services/authService';
// import { frameService } from '@/lib/services/frameService';

// // GET: Obtener todos los marcos del usuario
// export async function GET(request: NextRequest) {
//   try {
//     const session = await authService.verifySession();
//     if (!session.success || !session.user) {
//       return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
//     }

//     const result = await frameService.getUserFrames(session.user.id);
//     return NextResponse.json(result);
//   } catch (error) {
//     console.error('Error en GET /api/user/frames:', error);
//     return NextResponse.json(
//       { success: false, message: 'Error interno del servidor' },
//       { status: 500 }
//     );
//   }
// }

// // POST: Crear un nuevo marco
// export async function POST(request: NextRequest) {
//   try {
//     const session = await authService.verifySession();
//     if (!session.success || !session.user) {
//       return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
//     }

//     const frameData = await request.json();
//     const result = await frameService.createFrame(session.user.id, frameData);
    
//     if (!result.success) {
//       return NextResponse.json(result, { status: 400 });
//     }
    
//     return NextResponse.json(result);
//   } catch (error) {
//     console.error('Error en POST /api/user/frames:', error);
//     return NextResponse.json(
//       { success: false, message: 'Error interno del servidor' },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/authService';
import { frameService } from '@/lib/services/frameService';

// GET: Obtener todos los marcos del usuario
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/user/frames - Iniciando verificación');
    
    // Extraer token del header
    const token = authService.extractTokenFromHeader(request);
    console.log('🔍 Token extraído del header:', token ? 'Sí' : 'No');
    
    if (!token) {
      console.log('❌ No hay token en el header');
      return NextResponse.json({ 
        success: false, 
        message: 'No autorizado - Token no proporcionado' 
      }, { status: 401 });
    }

    // Verificar el token
    const session = await authService.verifyTokenFromString(token);
    console.log('🔍 Resultado de verificación:', session.success);
    
    if (!session.success || !session.user) {
      console.log('❌ Verificación fallida:', session.message);
      return NextResponse.json({ 
        success: false, 
        message: session.message || 'No autorizado' 
      }, { status: 401 });
    }

    console.log('✅ Usuario autenticado:', session.user.email);
    const result = await frameService.getUserFrames(session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Error en GET /api/user/frames:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo marco
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 POST /api/user/frames - Iniciando verificación');
    
    // Extraer token del header
    const token = authService.extractTokenFromHeader(request);
    console.log('🔍 Token extraído del header:', token ? 'Sí' : 'No');
    
    if (!token) {
      console.log('❌ No hay token en el header');
      return NextResponse.json({ 
        success: false, 
        message: 'No autorizado - Token no proporcionado' 
      }, { status: 401 });
    }

    // Verificar el token
    const session = await authService.verifyTokenFromString(token);
    console.log('🔍 Resultado de verificación:', session.success);
    
    if (!session.success || !session.user) {
      console.log('❌ Verificación fallida:', session.message);
      return NextResponse.json({ 
        success: false, 
        message: session.message || 'No autorizado' 
      }, { status: 401 });
    }

    console.log('✅ Usuario autenticado:', session.user.email);
    
    // Leer y loguear el body de la solicitud
    let frameData;
    try {
      frameData = await request.json();
      console.log('📥 Datos recibidos para crear marco:', frameData);
    } catch (parseError) {
      console.error('❌ Error al parsear JSON:', parseError);
      return NextResponse.json({ 
        success: false, 
        message: 'Formato de datos inválido' 
      }, { status: 400 });
    }

    // Validar datos mínimos
    if (!frameData.name || !frameData.style) {
      console.log('❌ Faltan campos obligatorios:', { 
        name: frameData.name, 
        style: frameData.style 
      });
      return NextResponse.json({ 
        success: false, 
        message: 'Faltan campos obligatorios: nombre y tipo de rostro' 
      }, { status: 400 });
    }

    const result = await frameService.createFrame(session.user.id, frameData);
    
    if (!result.success) {
      console.log('❌ Error al crear marco:', result.message);
      return NextResponse.json(result, { status: 400 });
    }
    
    console.log('✅ Marco creado exitosamente:', result.frame);
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Error en POST /api/user/frames:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}