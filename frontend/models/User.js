const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    constructor(data) {
        this.id = data.id;
        this.email = data.email;
        this.password = data.password;
        this.nombres = data.nombres;
        this.apellidoPaterno = data.apellido_paterno;
        this.apellidoMaterno = data.apellido_materno;
        this.preguntaSecreta = data.pregunta_secreta;
        this.respuestaSecreta = data.respuesta_secreta;
        this.role = data.role;
        this.isActive = data.is_active;
        this.passwordResetAttempts = data.password_reset_attempts;
        this.profileCompleteness = data.profile_completeness;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.lastLogin = data.last_login;
    }

    // Método para obtener el nombre completo
    getFullName() {
        return `${this.nombres} ${this.apellidoPaterno} ${this.apellidoMaterno}`.trim();
    }

    // Método para obtener el username (primera parte del email)
    getUsername() {
        return this.email.split('@')[0];
    }

    // Método para serializar para la sesión
    toSessionData() {
        return {
            id: this.id,
            email: this.email,
            nombres: this.nombres,
            apellidoPaterno: this.apellidoPaterno,
            apellidoMaterno: this.apellidoMaterno,
            role: this.role,
            username: this.getUsername(),
            fullName: this.getFullName()
        };
    }

    // Métodos estáticos para operaciones de base de datos

    // Buscar usuario por email
    static async findByEmail(email) {
        try {
            const result = await query(
                'SELECT * FROM users WHERE email = $1',
                [email.toLowerCase()]
            );
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return new User(result.rows[0]);
        } catch (error) {
            console.error('Error buscando usuario por email:', error);
            throw error;
        }
    }

    // Buscar usuario por ID
    static async findById(id) {
        try {
            const result = await query(
                'SELECT * FROM users WHERE id = $1',
                [id]
            );
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return new User(result.rows[0]);
        } catch (error) {
            console.error('Error buscando usuario por ID:', error);
            throw error;
        }
    }

    // Crear nuevo usuario
    static async create(userData) {
        try {
            // Hash de la contraseña
            const hashedPassword = await bcrypt.hash(userData.password, 12);
            
            const result = await query(`
                INSERT INTO users (
                    email, password, nombres, apellido_paterno, apellido_materno,
                    pregunta_secreta, respuesta_secreta, role, is_active, 
                    password_reset_attempts, profile_completeness
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            `, [
                userData.email.toLowerCase().trim(),
                hashedPassword,
                userData.nombres.trim(),
                userData.apellidoPaterno.trim(),
                userData.apellidoMaterno.trim(),
                userData.preguntaSecreta,
                userData.respuestaSecreta.toLowerCase().trim(),
                userData.role || 'user',
                userData.isActive !== undefined ? userData.isActive : true,
                userData.passwordResetAttempts || 0,
                userData.profileCompleteness || 100
            ]);
            
            return new User(result.rows[0]);
        } catch (error) {
            console.error('Error creando usuario:', error);
            throw error;
        }
    }

    // Validar contraseña
    async validatePassword(password) {
        try {
            console.log('🔐 Validando contraseña');
            console.log('📝 Contraseña ingresada:', password);
            console.log('💾 Contraseña almacenada (hash):', this.password);
            const isValid = await bcrypt.compare(password, this.password);
            console.log('✅ Resultado de la validación:', isValid);
            return isValid;
        } catch (error) {
            console.error('Error validando contraseña:', error);
            throw error;
        }
    }

    // Actualizar último login
    async updateLastLogin() {
        try {
            await query(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
                [this.id]
            );
            this.lastLogin = new Date();
        } catch (error) {
            console.error('Error actualizando último login:', error);
            throw error;
        }
    }

    // Actualizar contraseña
    async updatePassword(newPassword) {
        try {
            const hashedPassword = await bcrypt.hash(newPassword, 12);
            await query(
                'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [hashedPassword, this.id]
            );
            this.password = hashedPassword;
        } catch (error) {
            console.error('Error actualizando contraseña:', error);
            throw error;
        }
    }

    // Incrementar intentos de reset de contraseña
    async incrementPasswordResetAttempts() {
        try {
            await query(
                'UPDATE users SET password_reset_attempts = password_reset_attempts + 1 WHERE id = $1',
                [this.id]
            );
            this.passwordResetAttempts++;
        } catch (error) {
            console.error('Error incrementando intentos de reset:', error);
            throw error;
        }
    }

    // Resetear intentos de reset de contraseña
    async resetPasswordResetAttempts() {
        try {
            await query(
                'UPDATE users SET password_reset_attempts = 0 WHERE id = $1',
                [this.id]
            );
            this.passwordResetAttempts = 0;
        } catch (error) {
            console.error('Error reseteando intentos de reset:', error);
            throw error;
        }
    }

    // Listar todos los usuarios (solo para admin)
    static async findAll() {
        try {
            const result = await query(
                'SELECT * FROM users ORDER BY created_at DESC'
            );
            
            return result.rows.map(row => new User(row));
        } catch (error) {
            console.error('Error obteniendo todos los usuarios:', error);
            throw error;
        }
    }

    static async countActiveUsers() {
        try {
            const result = await query(
                'SELECT COUNT(*) as count FROM users WHERE is_active = true'
            );
            
            return parseInt(result.rows[0].count);
        } catch (error) {
            console.error('Error contando usuarios activos:', error);
            throw error;
        }
    }
}

module.exports = User;
