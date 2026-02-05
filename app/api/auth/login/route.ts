import { NextRequest, NextResponse } from 'next/server';
import { SecurityService } from '@/lib/security/auth';
import { userCRUD } from '@/lib/crud/userCrud';

export async function POST(request: NextRequest) {
  try {
    const credentials = await request.json();
    console.log('🔐 Login request para:', credentials.email);

    if (!credentials.email || !credentials.password) {
      return NextResponse.json(
        { success: false, message: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const securityService = SecurityService.getInstance();

    if (!securityService.validateEmail(credentials.email)) {
      return NextResponse.json(
        { success: false, message: 'Email inválido' },
        { status: 400 }
      );
    }

    const user = await userCRUD.getUserByEmail(credentials.email);
    console.log('👤 Usuario encontrado:', user ? 'Sí' : 'No');
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    console.log('🔑 Verificando contraseña...');
    const passwordValid = await securityService.verifyPassword(
      credentials.password,
      user.password
    );
    
    console.log('✅ Contraseña válida:', passwordValid);

    if (!passwordValid) {
      return NextResponse.json(
        { success: false, message: 'Contraseña incorrecta' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: 'Tu cuenta está desactivada. Contacta al administrador.' },
        { status: 403 }
      );
    }

    const { password, ...userWithoutPassword } = user;
    const token = securityService.generateToken(userWithoutPassword);

    console.log('🎟️ Token generado para:', user.email);

    return NextResponse.json({
      success: true,
      token,
      user: userWithoutPassword,
      message: 'Inicio de sesión exitoso'
    });
  } catch (error: any) {
    console.error('🔥 Error en login API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}