// Frontend/src/pages/admin/BackupAdmin.jsx
import { useState } from "react";
import { Card, Alert, Button, Spinner, Form, ListGroup, Badge, Tab, Nav, Modal, Row, Col } from "react-bootstrap";
import { FaDatabase, FaDownload, FaUpload, FaCheckCircle, FaExclamationTriangle, FaTrashAlt, FaBroom } from "react-icons/fa";
import { exportarBackup, restaurarBackup, limpiarDatos } from "../../api/backup";

export default function BackupAdmin() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [activeTab, setActiveTab] = useState("exportar");
  const [showModalConfirm, setShowModalConfirm] = useState(false);

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

  const handleLimpiarDatos = async () => {
    if (confirmText !== "CONFIRMAR_LIMPIAR_DATOS") {
      setMessage({
        type: "warning",
        text: "Debes escribir exactamente 'CONFIRMAR_LIMPIAR_DATOS' para continuar",
      });
      return;
    }

    // Mostrar modal de confirmación final
    setShowModalConfirm(true);
  };

  const confirmarLimpiarDatos = async () => {
    setShowModalConfirm(false);

    try {
      setLoading(true);
      setMessage(null);

      const response = await limpiarDatos(confirmText);

      setMessage({
        type: "success",
        text: response.message || "Datos limpiados correctamente",
      });
      setConfirmText("");

      // Recargar después de 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error("Error al limpiar datos:", error);
      setMessage({
        type: "danger",
        text: error.response?.data?.message || "Error al limpiar los datos",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-2 p-md-4">
      {/* Header mejorado */}
      <div className="mb-4">
        <div className="d-flex align-items-center gap-3 mb-2">
          <div
            className="rounded-4 d-inline-flex align-items-center justify-content-center"
            style={{ 
              width: 56, 
              height: 56, 
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)"
            }}
          >
            <FaDatabase size={28} color="white" />
          </div>
          <div>
            <h1 className="mb-1" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>
              Gestión de Base de Datos
            </h1>
            <p className="text-muted mb-0" style={{ fontSize: 14 }}>
              Respaldo, restauración y limpieza de datos del sistema
            </p>
          </div>
        </div>
      </div>

      {message && (
        <Alert 
          variant={message.type} 
          className="rounded-4 d-flex align-items-center gap-2 shadow-sm mb-4"
          dismissible
          onClose={() => setMessage(null)}
          style={{ 
            border: "none",
            animation: "fadeIn 0.3s ease-in"
          }}
        >
          {message.type === "success" ? <FaCheckCircle size={20} /> : <FaExclamationTriangle size={20} />}
          <div>{message.text}</div>
        </Alert>
      )}

      {/* Tabs mejorados */}
      <Tab.Container activeKey={activeTab} onSelect={(k) => { setActiveTab(k); setMessage(null); }}>
        <Nav variant="pills" className="mb-4 gap-2">
          <Nav.Item>
            <Nav.Link 
              eventKey="exportar" 
              className="rounded-3 d-inline-flex align-items-center gap-2 px-4 py-2"
              style={{ 
                fontWeight: 600,
                transition: "all 0.2s ease"
              }}
            >
              <FaDownload /> Exportar Backup
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              eventKey="restaurar" 
              className="rounded-3 d-inline-flex align-items-center gap-2 px-4 py-2"
              style={{ 
                fontWeight: 600,
                transition: "all 0.2s ease"
              }}
            >
              <FaUpload /> Restaurar Backup
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              eventKey="limpiar" 
              className="rounded-3 d-inline-flex align-items-center gap-2 px-4 py-2"
              style={{ 
                fontWeight: 600,
                transition: "all 0.2s ease"
              }}
            >
              <FaBroom /> Limpiar Datos
            </Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          {/* TAB: Exportar Backup */}
          <Tab.Pane eventKey="exportar">
            <Card className="border-0 rounded-4 shadow-sm overflow-hidden">
              <div 
                className="p-4"
                style={{ 
                  background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)",
                  borderBottom: "1px solid #e9ecef"
                }}
              >
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div
                    className="rounded-3 d-inline-flex align-items-center justify-content-center"
                    style={{ 
                      width: 48, 
                      height: 48, 
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    }}
                  >
                    <FaDownload size={22} color="white" />
                  </div>
                  <div>
                    <h4 className="mb-1" style={{ fontWeight: 700 }}>
                      Exportar Base de Datos
                    </h4>
                    <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                      Genera un respaldo completo en formato SQL
                    </p>
                  </div>
                </div>
              </div>

              <Card.Body className="p-4">
                <Row className="g-3 mb-4">
                  <Col md={6}>
                    <Alert variant="info" className="rounded-3 border-0 h-100 mb-0" style={{ backgroundColor: "#e7f3ff" }}>
                      <div className="d-flex gap-2">
                        <FaCheckCircle size={18} className="text-info mt-1 flex-shrink-0" />
                        <div>
                          <strong className="d-block mb-2" style={{ fontSize: 13 }}>¿Qué incluye el backup?</strong>
                          <ul className="mb-0 ps-3" style={{ fontSize: 12 }}>
                            <li>Estructura completa de tablas</li>
                            <li>Todos los datos del sistema</li>
                            <li>Relaciones e integridad</li>
                            <li>Índices y claves</li>
                          </ul>
                        </div>
                      </div>
                    </Alert>
                  </Col>
                  <Col md={6}>
                    <div className="bg-light rounded-3 p-3 h-100">
                      <h6 className="fw-bold mb-2" style={{ fontSize: 13 }}>📋 Recomendaciones:</h6>
                      <ul className="mb-0 text-muted ps-3" style={{ fontSize: 12 }}>
                        <li>Backups diarios antes del cierre</li>
                        <li>Almacenar en ubicación segura</li>
                        <li>Mantener múltiples versiones</li>
                        <li>Verificar integridad del archivo</li>
                      </ul>
                    </div>
                  </Col>
                </Row>

                <div className="text-center">
                  <Button
                    variant="primary"
                    onClick={handleExportBackup}
                    disabled={loading}
                    className="d-inline-flex align-items-center justify-content-center gap-2 px-5 py-2 rounded-3"
                  style={{ 
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      border: "none",
                      fontWeight: 600,
                      boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
                      minWidth: "280px"
                    }}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" />
                        Generando backup...
                      </>
                    ) : (
                      <>
                        <FaDownload size={16} /> Descargar Backup
                      </>
                    )}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* TAB: Restaurar Backup */}
          <Tab.Pane eventKey="restaurar">
            <Card className="border-0 rounded-4 shadow-sm overflow-hidden">
              <div 
                className="p-4"
                style={{ 
                  background: "linear-gradient(135deg, #f093fb15 0%, #f5576c15 100%)",
                  borderBottom: "1px solid #e9ecef"
                }}
              >
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div
                    className="rounded-3 d-inline-flex align-items-center justify-content-center"
                    style={{ 
                      width: 48, 
                      height: 48, 
                      background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                    }}
                  >
                    <FaUpload size={22} color="white" />
                  </div>
                  <div>
                    <h4 className="mb-1" style={{ fontWeight: 700 }}>
                      Restaurar Base de Datos
                    </h4>
                    <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                      Recupera un respaldo previamente generado
                    </p>
                  </div>
                </div>
              </div>

              <Card.Body className="p-4">
                <Row className="g-3 mb-4">
                  <Col md={6}>
                    <Alert variant="danger" className="rounded-3 border-0 h-100 mb-0" style={{ backgroundColor: "#ffe5e5" }}>
                      <div className="d-flex gap-2">
                        <FaExclamationTriangle size={20} className="text-danger mt-1 flex-shrink-0" />
                        <div>
                          <strong className="d-block mb-2 text-danger" style={{ fontSize: 13 }}>⚠️ ADVERTENCIA CRÍTICA</strong>
                          <p className="mb-2" style={{ fontSize: 12 }}>
                            Restaurar un backup <strong>eliminará todos los datos actuales</strong> y los reemplazará 
                            con los del archivo seleccionado.
                          </p>
                          <div className="bg-white rounded-2 p-2">
                            <small className="text-muted" style={{ fontSize: 11 }}>
                              <strong>Tip:</strong> Exporta un backup antes de restaurar.
                            </small>
                          </div>
                        </div>
                      </div>
                    </Alert>
                  </Col>
                  <Col md={6}>
                    <div className="bg-light rounded-3 p-3 h-100">
                      <h6 className="fw-bold mb-2" style={{ fontSize: 13 }}>📝 Proceso de restauración:</h6>
                      <ol className="mb-0 text-muted ps-3" style={{ fontSize: 12 }}>
                        <li className="mb-1">Selecciona archivo SQL</li>
                        <li className="mb-1">Validación del formato</li>
                        <li className="mb-1">Ejecución de instrucciones</li>
                        <li>Recarga automática</li>
                      </ol>
                    </div>
                  </Col>
                </Row>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold mb-2">
                    Seleccionar archivo de backup (.sql)
                  </Form.Label>
                  <div className="position-relative">
                    <Form.Control
                      type="file"
                      accept=".sql"
                      onChange={handleFileChange}
                      disabled={loading}
                      className="rounded-3"
                      style={{ 
                        padding: "12px",
                        border: "2px dashed #dee2e6",
                        cursor: "pointer"
                      }}
                    />
                  </div>
                  {selectedFile && (
                    <div className="mt-3 p-3 bg-success bg-opacity-10 rounded-3 border border-success border-opacity-25">
                      <div className="d-flex align-items-center gap-2">
                        <FaCheckCircle className="text-success" />
                        <div style={{ fontSize: 13 }}>
                          <strong>Archivo seleccionado:</strong> {selectedFile.name}
                          <br />
                          <span className="text-muted">
                            Tamaño: {(selectedFile.size / 1024).toFixed(2)} KB
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </Form.Group>

                <div className="text-center">
                  <Button
                    variant="danger"
                    onClick={handleRestoreBackup}
                    disabled={loading || !selectedFile}
                    className="d-inline-flex align-items-center justify-content-center gap-2 px-5 py-2 rounded-3"
                    style={{ 
                      fontWeight: 600,
                      boxShadow: selectedFile ? "0 4px 15px rgba(220, 53, 69, 0.3)" : "none",
                      minWidth: "280px"
                    }}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" />
                        Restaurando...
                      </>
                    ) : (
                      <>
                        <FaUpload size={16} /> Restaurar Backup
                      </>
                    )}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* TAB: Limpiar Datos */}
          <Tab.Pane eventKey="limpiar">
            <Card className="border-0 rounded-4 shadow-sm overflow-hidden">
              <div 
                className="p-4"
                style={{ 
                  background: "linear-gradient(135deg, #fa709a15 0%, #fee14015 100%)",
                  borderBottom: "1px solid #e9ecef"
                }}
              >
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div
                    className="rounded-3 d-inline-flex align-items-center justify-content-center"
                    style={{ 
                      width: 48, 
                      height: 48, 
                      background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
                    }}
                  >
                    <FaBroom size={22} color="white" />
                  </div>
                  <div>
                    <h4 className="mb-1" style={{ fontWeight: 700 }}>
                      Limpiar Datos Transaccionales
                    </h4>
                    <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                      Elimina datos de operación manteniendo la configuración
                    </p>
                  </div>
                </div>
              </div>

              <Card.Body className="p-4">
                <Row className="g-3 mb-3">
                  <Col md={6}>
                    <Alert variant="danger" className="rounded-3 border-0 h-100 mb-0" style={{ backgroundColor: "#ffe5e5" }}>
                      <div className="d-flex gap-2">
                        <FaExclamationTriangle size={20} className="text-danger mt-1 flex-shrink-0" />
                        <div>
                          <strong className="d-block mb-2 text-danger" style={{ fontSize: 13 }}>⚠️ OPERACIÓN DESTRUCTIVA</strong>
                          <p className="mb-2" style={{ fontSize: 12 }}>
                            Se eliminarán <strong>permanentemente</strong>:
                          </p>
                          <ul className="mb-0 ps-3" style={{ fontSize: 11 }}>
                            <li>Órdenes y detalles</li>
                            <li>Facturas emitidas</li>
                            <li>Sesiones de caja y pagos</li>
                            <li>Historial de estados</li>
                            <li>Bitácora completa</li>
                          </ul>
                        </div>
                      </div>
                    </Alert>
                  </Col>
                  <Col md={6}>
                    <Alert variant="success" className="rounded-3 border-0 h-100 mb-0" style={{ backgroundColor: "#e5f8e8" }}>
                      <div className="d-flex gap-2">
                        <FaCheckCircle size={18} className="text-success mt-1 flex-shrink-0" />
                        <div>
                          <strong className="d-block mb-2 text-success" style={{ fontSize: 13 }}>✅ Se mantendrán intactos:</strong>
                          <ul className="mb-0 ps-3" style={{ fontSize: 11 }}>
                            <li>Usuarios y accesos</li>
                            <li>Clientes registrados</li>
                            <li>Productos y categorías</li>
                            <li>CAI y facturación</li>
                            <li>Impuestos y descuentos</li>
                            <li>Permisos y roles</li>
                          </ul>
                        </div>
                      </div>
                    </Alert>
                  </Col>
                </Row>

                <Row className="g-3 mb-3">
                  <Col md={6}>
                    <div className="bg-light rounded-3 p-3 h-100">
                      <h6 className="fw-bold mb-2" style={{ fontSize: 13 }}>🎯 ¿Cuándo usar esta función?</h6>
                      <ul className="mb-0 text-muted ps-3" style={{ fontSize: 12 }}>
                        <li>Iniciar nuevo período contable</li>
                        <li>Después de pruebas del sistema</li>
                        <li>Limpiar datos de demostración</li>
                        <li>Cambio de año fiscal</li>
                      </ul>
                    </div>
                  </Col>
                  <Col md={6}>
                    <Card className="bg-warning bg-opacity-10 border-warning border-2 h-100 mb-0">
                      <Card.Body className="p-3">
                        <h6 className="fw-bold mb-2" style={{ fontSize: 13 }}>
                          <FaExclamationTriangle className="me-2 text-warning" />
                          Confirmación de seguridad
                        </h6>
                        <p className="mb-2 text-muted" style={{ fontSize: 12 }}>
                          Escribe <strong>exactamente</strong> el siguiente texto:
                        </p>
                        <Badge 
                          bg="dark" 
                          className="mb-2 py-1 px-2" 
                          style={{ 
                            fontSize: 11, 
                            fontFamily: "monospace",
                            letterSpacing: "0.5px"
                          }}
                        >
                          CONFIRMAR_LIMPIAR_DATOS
                        </Badge>
                        <Form.Control
                          type="text"
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value)}
                          placeholder="Texto de confirmación..."
                          disabled={loading}
                          className="rounded-3"
                          style={{ 
                            padding: "8px 12px",
                            fontFamily: "monospace",
                            fontSize: 12
                          }}
                        />
                        {confirmText && confirmText !== "CONFIRMAR_LIMPIAR_DATOS" && (
                          <small className="text-danger d-block mt-2" style={{ fontSize: 11 }}>
                            ❌ El texto no coincide
                          </small>
                        )}
                        {confirmText === "CONFIRMAR_LIMPIAR_DATOS" && (
                          <small className="text-success d-block mt-2" style={{ fontSize: 11 }}>
                            ✅ Texto correcto
                          </small>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <div className="text-center mt-3">
                  <Button
                    variant="danger"
                    onClick={handleLimpiarDatos}
                    disabled={loading || confirmText !== "CONFIRMAR_LIMPIAR_DATOS"}
                    className="d-inline-flex align-items-center justify-content-center gap-2 px-5 py-2 rounded-3"
                    style={{ 
                      fontWeight: 600,
                      boxShadow: confirmText === "CONFIRMAR_LIMPIAR_DATOS" ? "0 4px 15px rgba(220, 53, 69, 0.3)" : "none",
                      minWidth: "280px"
                    }}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" />
                        Limpiando...
                      </>
                    ) : (
                      <>
                        <FaTrashAlt size={16} /> Limpiar Datos
                      </>
                    )}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      {/* Modal de confirmación final mejorado */}
      <Modal 
        show={showModalConfirm} 
        onHide={() => setShowModalConfirm(false)}
        backdrop="static"
        keyboard={false}
        centered
        size="lg"
      >
        <Modal.Header 
          className="border-0 text-white"
          style={{
            background: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
            padding: "1.5rem"
          }}
        >
          <Modal.Title className="d-flex align-items-center gap-3 w-100">
            <div
              className="rounded-3 d-inline-flex align-items-center justify-content-center"
              style={{ 
                width: 48, 
                height: 48, 
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(10px)"
              }}
            >
              <FaExclamationTriangle size={24} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                ÚLTIMA ADVERTENCIA
              </div>
              <small style={{ opacity: 0.9, fontWeight: 400 }}>
                Esta acción no se puede deshacer
              </small>
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Alert variant="danger" className="rounded-3 border-0 mb-4" style={{ backgroundColor: "#ffe5e5" }}>
            <div className="d-flex gap-3">
              <FaExclamationTriangle size={22} className="text-danger flex-shrink-0 mt-1" />
              <div>
                <strong className="d-block mb-2 text-danger">Esta acción es IRREVERSIBLE</strong>
                <p className="mb-0" style={{ fontSize: 14 }}>
                  Se borrarán permanentemente todos los datos transaccionales. 
                  Asegúrate de haber exportado un backup si necesitas conservar esta información.
                </p>
              </div>
            </div>
          </Alert>

          <div className="mb-4">
            <h6 className="fw-bold mb-3">🗑️ Se eliminarán:</h6>
            <div className="row g-2">
              {[
                "Órdenes y detalles",
                "Facturas emitidas", 
                "Sesiones de caja",
                "Pagos registrados",
                "Historial de estados",
                "Bitácora completa"
              ].map((item, idx) => (
                <div key={idx} className="col-6">
                  <div className="bg-danger bg-opacity-10 rounded-2 p-2 text-center">
                    <small className="text-danger fw-semibold">{item}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Alert variant="info" className="rounded-3 border-0 mb-0" style={{ backgroundColor: "#e7f3ff" }}>
            <small>
              <FaCheckCircle className="text-info me-2" />
              <strong>Se mantendrán:</strong> Usuarios, clientes, productos y toda la configuración del sistema.
            </small>
          </Alert>
        </Modal.Body>
        <Modal.Footer className="border-0 p-4 pt-0">
          <Button 
            variant="outline-secondary" 
            onClick={() => setShowModalConfirm(false)}
            disabled={loading}
            className="px-4 py-2 rounded-3"
            style={{ fontWeight: 600 }}
          >
            Cancelar
          </Button>
          <Button 
            variant="danger" 
            onClick={confirmarLimpiarDatos}
            disabled={loading}
            className="px-4 py-2 rounded-3 d-inline-flex align-items-center gap-2"
            style={{ 
              fontWeight: 600,
              background: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
              border: "none",
              boxShadow: "0 4px 15px rgba(220, 53, 69, 0.4)"
            }}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" />
                Limpiando...
              </>
            ) : (
              <>
                <FaTrashAlt />
                Sí, Eliminar Todos los Datos
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .nav-pills .nav-link {
          position: relative;
          overflow: hidden;
        }

        .nav-pills .nav-link::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .nav-pills .nav-link:hover::before {
          opacity: 1;
        }

        .nav-pills .nav-link.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        .btn {
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );
}
