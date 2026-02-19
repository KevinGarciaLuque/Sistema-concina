// Frontend/src/pages/admin/BackupAdmin.jsx
import { useState } from "react";
import { Card, Alert, Button, Spinner, Form, ListGroup } from "react-bootstrap";
import { FaDatabase, FaDownload, FaUpload, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { exportarBackup, restaurarBackup } from "../../api/backup";

export default function BackupAdmin() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleExportBackup = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const blob = await exportarBackup();
      
      // Crear un enlace temporal para descargar el archivo
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Nombre del archivo con timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      link.download = `backup-${timestamp}.sql`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setMessage({
        type: "success",
        text: "Backup exportado correctamente. El archivo se ha descargado.",
      });
    } catch (error) {
      console.error("Error al exportar backup:", error);
      setMessage({
        type: "danger",
        text: error.response?.data?.message || "Error al exportar el backup",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setMessage(null);
  };

  const handleRestoreBackup = async () => {
    if (!selectedFile) {
      setMessage({
        type: "warning",
        text: "Por favor selecciona un archivo SQL para restaurar",
      });
      return;
    }

    // Confirmación adicional
    const confirmed = window.confirm(
      "⚠️ ADVERTENCIA: Esta acción reemplazará todos los datos actuales de la base de datos. ¿Estás seguro de continuar?"
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setMessage(null);

      // Leer el contenido del archivo
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const sqlContent = event.target.result;
          
          await restaurarBackup(sqlContent);

          setMessage({
            type: "success",
            text: "Base de datos restaurada correctamente. Se recomienda recargar la página.",
          });
          setSelectedFile(null);
          
          // Opcional: recargar después de unos segundos
          setTimeout(() => {
            window.location.reload();
          }, 3000);

        } catch (error) {
          console.error("Error al restaurar backup:", error);
          setMessage({
            type: "danger",
            text: error.response?.data?.message || "Error al restaurar el backup",
          });
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        setMessage({
          type: "danger",
          text: "Error al leer el archivo",
        });
        setLoading(false);
      };

      reader.readAsText(selectedFile);

    } catch (error) {
      console.error("Error:", error);
      setMessage({
        type: "danger",
        text: "Error al procesar el archivo",
      });
      setLoading(false);
    }
  };

  return (
    <div className="p-2 p-md-3">
      <div className="d-flex align-items-center gap-2 mb-3">
        <div
          className="rounded-3 d-inline-flex align-items-center justify-content-center"
          style={{ width: 40, height: 40, background: "rgba(25,135,84,.12)" }}
        >
          <FaDatabase />
        </div>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.4 }}>
            Backup Base de Datos
          </div>
          <div className="text-muted" style={{ fontSize: 12 }}>
            Exportar y restaurar copias de seguridad de la base de datos
          </div>
        </div>
      </div>

      {message && (
        <Alert 
          variant={message.type} 
          className="rounded-4 d-flex align-items-center gap-2"
          dismissible
          onClose={() => setMessage(null)}
        >
          {message.type === "success" ? <FaCheckCircle /> : <FaExclamationTriangle />}
          {message.text}
        </Alert>
      )}

      <Alert variant="info" className="rounded-4">
        <strong>Importante:</strong> Solo los administradores pueden realizar backups. 
        Asegúrate de guardar los archivos de backup en un lugar seguro.
      </Alert>

      {/* Exportar Backup */}
      <Card className="shadow-sm border-0 rounded-4 mb-3">
        <Card.Body>
          <h5 className="mb-3">
            <FaDownload className="me-2" />
            Exportar Backup
          </h5>
          <p className="text-muted small mb-3">
            Descarga una copia completa de la base de datos en formato SQL. 
            Este archivo contiene todas las tablas, datos y estructura.
          </p>
          <Button
            variant="primary"
            onClick={handleExportBackup}
            disabled={loading}
            className="d-inline-flex align-items-center gap-2"
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" />
                Exportando...
              </>
            ) : (
              <>
                <FaDownload /> Exportar Backup
              </>
            )}
          </Button>
        </Card.Body>
      </Card>

      {/* Restaurar Backup */}
      <Card className="shadow-sm border-0 rounded-4">
        <Card.Body>
          <h5 className="mb-3">
            <FaUpload className="me-2" />
            Restaurar Backup
          </h5>
          <Alert variant="warning" className="rounded-3">
            <FaExclamationTriangle className="me-2" />
            <strong>PRECAUCIÓN:</strong> Restaurar un backup reemplazará todos los datos actuales. 
            Se recomienda hacer un backup antes de restaurar.
          </Alert>
          <Form.Group className="mb-3">
            <Form.Label>Seleccionar archivo SQL</Form.Label>
            <Form.Control
              type="file"
              accept=".sql"
              onChange={handleFileChange}
              disabled={loading}
            />
            {selectedFile && (
              <Form.Text className="text-muted">
                Archivo seleccionado: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </Form.Text>
            )}
          </Form.Group>
          <Button
            variant="danger"
            onClick={handleRestoreBackup}
            disabled={loading || !selectedFile}
            className="d-inline-flex align-items-center gap-2"
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" />
                Restaurando...
              </>
            ) : (
              <>
                <FaUpload /> Restaurar Backup
              </>
            )}
          </Button>
        </Card.Body>
      </Card>
    </div>
  );
}
