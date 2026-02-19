// backend/routes/backup.js
import express from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { auth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";
import dotenv from "dotenv";
import mysqldump from "mysqldump";

dotenv.config();

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directorio para backups
const BACKUP_DIR = path.join(__dirname, "../backups");

// Asegurar que el directorio existe
async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (err) {
    console.error("Error creando directorio de backups:", err);
  }
}

ensureBackupDir();

/**
 * GET /api/backup/export
 * Exporta la base de datos completa
 * Solo accesible para administradores
 */
router.get("/export", auth, allowRoles("admin"), async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `backup-${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

    console.log("Iniciando backup de la base de datos...");

    // Usar la librería mysqldump
    const result = await mysqldump({
      connection: {
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
      },
      dumpToFile: filepath,
    });

    console.log(`Backup creado exitosamente: ${filename}`);

    // Verificar que el archivo fue creado
    const stats = await fs.stat(filepath);
    console.log(`Tamaño del backup: ${stats.size} bytes`);

    if (stats.size === 0) {
      throw new Error("El backup está vacío");
    }

    // Enviar el archivo para descarga
    res.download(filepath, filename, async (err) => {
      if (err) {
        console.error("Error al enviar el archivo:", err);
      }
      
      // Opcional: eliminar el archivo después de la descarga
      // Descomenta la siguiente línea si quieres eliminar el backup después de descargarlo
      // await fs.unlink(filepath).catch(() => {});
    });

  } catch (error) {
    console.error("Error al exportar backup:", error);
    res.status(500).json({
      ok: false,
      message: "Error al exportar la base de datos",
      error: error.message,
    });
  }
});

/**
 * POST /api/backup/restore
 * Restaura la base de datos desde un archivo SQL
 * Solo accesible para administradores
 */
router.post("/restore", auth, allowRoles("admin"), async (req, res) => {
  try {
    const { sqlContent } = req.body;

    if (!sqlContent) {
      return res.status(400).json({
        ok: false,
        message: "No se proporcionó contenido SQL",
      });
    }

    // Guardar temporalmente el contenido SQL
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const tempFile = path.join(BACKUP_DIR, `temp-restore-${timestamp}.sql`);
    
    await fs.writeFile(tempFile, sqlContent, "utf-8");

    console.log("Restaurando backup desde archivo temporal...");

    // Importar usando mysql2
    const pool = (await import("../db.js")).default;
    const connection = await pool.getConnection();

    try {
      // Leer el contenido del archivo
      const sqlStatements = await fs.readFile(tempFile, "utf-8");
      
      // Dividir en statements individuales (simple split por ;)
      // Nota: Esto es básico, para casos complejos necesitarías un parser mejor
      const statements = sqlStatements
        .split(";")
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith("--"));

      console.log(`Ejecutando ${statements.length} statements SQL...`);

      // Ejecutar cada statement
      for (const statement of statements) {
        if (statement.trim()) {
          await connection.query(statement);
        }
      }

      console.log("Backup restaurado exitosamente");

      res.json({
        ok: true,
        message: "Base de datos restaurada correctamente",
      });

    } finally {
      connection.release();
      // Eliminar archivo temporal
      await fs.unlink(tempFile).catch(() => {});
    }

  } catch (error) {
    console.error("Error al restaurar backup:", error);
    res.status(500).json({
      ok: false,
      message: "Error al restaurar la base de datos",
      error: error.message,
    });
  }
});

/**
 * GET /api/backup/list
 * Lista los backups disponibles
 * Solo accesible para administradores
 */
router.get("/list", auth, allowRoles("admin"), async (req, res) => {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backups = [];

    for (const file of files) {
      if (file.endsWith(".sql") && file.startsWith("backup-")) {
        const filepath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filepath);
        
        backups.push({
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
        });
      }
    }

    // Ordenar por fecha de creación, más reciente primero
    backups.sort((a, b) => b.created - a.created);

    res.json({
      ok: true,
      backups,
    });

  } catch (error) {
    console.error("Error al listar backups:", error);
    res.status(500).json({
      ok: false,
      message: "Error al listar backups",
      error: error.message,
    });
  }
});

export default router;
