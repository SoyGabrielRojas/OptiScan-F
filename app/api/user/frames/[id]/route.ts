import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/authService';
import { frameService } from '@/lib/services/frameService';

// PUT: Actualizar un marco
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Extraer token del header
    const token = authService.extractTokenFromHeader(request);
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        message: 'No autorizado - Token no proporcionado' 
      }, { status: 401 });
    }

    // Verificar el token
    const session = await authService.verifyTokenFromString(token);
    if (!session.success || !session.user) {
      return NextResponse.json({ 
        success: false, 
        message: session.message || 'No autorizado' 
      }, { status: 401 });
    }

    const frameData = await request.json();
    const result = await frameService.updateFrame(params.id, session.user.id, frameData);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error en PUT /api/user/frames/[id]:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un marco
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Extraer token del header
    const token = authService.extractTokenFromHeader(request);
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        message: 'No autorizado - Token no proporcionado' 
      }, { status: 401 });
    }

    // Verificar el token
    const session = await authService.verifyTokenFromString(token);
    if (!session.success || !session.user) {
      return NextResponse.json({ 
        success: false, 
        message: session.message || 'No autorizado' 
      }, { status: 401 });
    }

    const result = await frameService.deleteFrame(params.id, session.user.id);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error en DELETE /api/user/frames/[id]:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}