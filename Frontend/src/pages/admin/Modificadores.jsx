import { useEffect, useMemo, useState } from "react";
import {
  obtenerModificadores,
  crearModificador,
  actualizarModificador,
  cambiarActivoModificador,
  eliminarModificador,
  obtenerOpciones,
  crearOpcion,
  actualizarOpcion,
  cambiarActivoOpcion,
  eliminarOpcion,
} from "../../api/modificadores";

import ModalConfirm from "../../components/common/ModalConfirm";
import { FaEdit, FaTrash, FaPlus, FaExclamationTriangle } from "react-icons/fa";

const money = (n) => `L ${Number(n || 0).toFixed(2)}`;

export default function ModificadoresAdmin() {
  const [cargando, setCargando] = useState(true);
  const [mods, setMods] = useState([]);
  const [opc, setOpc] = useState([]);

  const [selectedId, setSelectedId] = useState(null);
  const selected = useMemo(
    () => mods.find((m) => m.id === selectedId) || null,
    [mods, selectedId],
  );

  const [msg, setMsg] = useState(null);

  // forms
  const [formMod, setFormMod] = useState({
    id: null,
    nombre: "",
    requerido: 0,
    multiple: 0,
    activo: 1,
  });
  const [formOp, setFormOp] = useState({
    id: null,
    nombre: "",
    precio_extra: "0",
    activo: 1,
    orden: "",
  });

  // confirm modal
  const [confirm, setConfirm] = useState({
    show: false,
    type: "",
    id: null,
    nombre: "",
  });
  const [loadingConfirm, setLoadingConfirm] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await obtenerModificadores({ todos: true });
      setMods(data);
      if (!selectedId && data.length) setSelectedId(data[0].id);
    } catch (e) {
      console.error(e);
      setMsg({ type: "danger", text: "No se pudieron cargar modificadores." });
    } finally {
      setCargando(false);
    }
  };

  const cargarOpciones = async (modId) => {
    try {
      const data = await obtenerOpciones(modId);
      setOpc(data);
    } catch (e) {
      console.error(e);
      setOpc([]);
      setMsg({ type: "danger", text: "No se pudieron cargar opciones." });
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    if (selectedId) cargarOpciones(selectedId);
    // limpiar form opción cuando cambia el modificador
    setFormOp({
      id: null,
      nombre: "",
      precio_extra: "0",
      activo: 1,
      orden: "",
    });
  }, [selectedId]);

  const resetMod = () =>
    setFormMod({ id: null, nombre: "", requerido: 0, multiple: 0, activo: 1 });
  const resetOp = () =>
    setFormOp({
      id: null,
      nombre: "",
      precio_extra: "0",
      activo: 1,
      orden: "",
    });

  const submitMod = async (e) => {
    e.preventDefault();
    setMsg(null);
    const payload = {
      nombre: formMod.nombre.trim(),
      requerido: Number(formMod.requerido) ? 1 : 0,
      multiple: Number(formMod.multiple) ? 1 : 0,
      activo: Number(formMod.activo) ? 1 : 0,
    };
    if (!payload.nombre) return;

    try {
      if (!formMod.id) await crearModificador(payload);
      else await actualizarModificador(formMod.id, payload);

      setMsg({ type: "success", text: "Modificador guardado." });
      resetMod();
      await cargar();
    } catch (e) {
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "Error al guardar modificador.",
      });
    }
  };

  const submitOp = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!selectedId)
      return setMsg({ type: "danger", text: "Selecciona un modificador." });

    const payload = {
      nombre: formOp.nombre.trim(),
      precio_extra: Number(formOp.precio_extra || 0),
      activo: Number(formOp.activo) ? 1 : 0,
      orden: formOp.orden === "" ? undefined : Number(formOp.orden),
    };
    if (!payload.nombre) return;

    try {
      if (!formOp.id) await crearOpcion(selectedId, payload);
      else await actualizarOpcion(formOp.id, payload);

      setMsg({ type: "success", text: "Opción guardada." });
      resetOp();
      await cargarOpciones(selectedId);
    } catch (e) {
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "Error al guardar opción.",
      });
    }
  };

  const editMod = (m) =>
    setFormMod({
      id: m.id,
      nombre: m.nombre || "",
      requerido: m.requerido ? 1 : 0,
      multiple: m.multiple ? 1 : 0,
      activo: m.activo ? 1 : 0,
    });
  const editOp = (o) =>
    setFormOp({
      id: o.id,
      nombre: o.nombre || "",
      precio_extra: String(o.precio_extra ?? "0"),
      activo: o.activo ? 1 : 0,
      orden: o.orden ?? "",
    });

  const toggleModActivo = async (m) => {
    const nuevo = m.activo ? 0 : 1;
    setMods((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, activo: nuevo } : x)),
    );
    try {
      await cambiarActivoModificador(m.id, nuevo);
    } catch (e) {
      setMsg({ type: "danger", text: "No se pudo cambiar el estado." });
      await cargar();
    }
  };

  const toggleOpActivo = async (o) => {
    const nuevo = o.activo ? 0 : 1;
    setOpc((prev) =>
      prev.map((x) => (x.id === o.id ? { ...x, activo: nuevo } : x)),
    );
    try {
      await cambiarActivoOpcion(o.id, nuevo);
    } catch (e) {
      setMsg({ type: "danger", text: "No se pudo cambiar el estado." });
      await cargarOpciones(selectedId);
    }
  };

  const askDelete = (type, id, nombre) =>
    setConfirm({ show: true, type, id, nombre });

  const doDelete = async () => {
    setLoadingConfirm(true);
    try {
      if (confirm.type === "mod") {
        await eliminarModificador(confirm.id);
        setMsg({ type: "success", text: "Modificador eliminado." });
        setConfirm({ show: false, type: "", id: null, nombre: "" });
        await cargar();
        // si borramos el seleccionado
        if (selectedId === confirm.id) {
          setSelectedId(null);
          setOpc([]);
        }
      } else if (confirm.type === "op") {
        await eliminarOpcion(confirm.id);
        setMsg({ type: "success", text: "Opción eliminada." });
        setConfirm({ show: false, type: "", id: null, nombre: "" });
        await cargarOpciones(selectedId);
      }
    } catch (e) {
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || "No se pudo eliminar.",
      });
    } finally {
      setLoadingConfirm(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-end mb-3">
        <div>
          <h4 className="mb-0">Modificadores</h4>
          <small className="text-muted">
            Crea “Proteína”, “Salsa”, “Extras” y sus opciones.
          </small>
        </div>
      </div>

      {msg && <div className={`alert alert-${msg.type} py-2`}>{msg.text}</div>}

      <div className="row g-3">
        {/* Izquierda: modificadores */}
        <div className="col-12 col-lg-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Lista de modificadores</h6>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={resetMod}
                >
                  Nuevo
                </button>
              </div>

              <div
                style={{
                  maxHeight: "45vh",
                  overflow: "auto",
                  borderRadius: 10,
                }}
              >
                <table className="table table-hover align-middle mb-0">
                  <thead
                    className="table-light"
                    style={{ position: "sticky", top: 0, zIndex: 2 }}
                  >
                    <tr>
                      <th>Nombre</th>
                      <th className="text-center" style={{ width: 90 }}>
                        Req.
                      </th>
                      <th className="text-center" style={{ width: 90 }}>
                        Multi
                      </th>
                      <th className="text-center" style={{ width: 90 }}>
                        Activo
                      </th>
                      <th className="text-end" style={{ width: 130 }}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargando ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4">
                          Cargando...
                        </td>
                      </tr>
                    ) : mods.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4">
                          Sin modificadores.
                        </td>
                      </tr>
                    ) : (
                      mods.map((m) => (
                        <tr
                          key={m.id}
                          className={m.id === selectedId ? "table-primary" : ""}
                          style={{ cursor: "pointer" }}
                          onClick={() => setSelectedId(m.id)}
                        >
                          <td className="fw-semibold">{m.nombre}</td>
                          <td className="text-center">
                            {m.requerido ? "Sí" : "No"}
                          </td>
                          <td className="text-center">
                            {m.multiple ? "Sí" : "No"}
                          </td>
                          <td className="text-center">
                            <div className="form-check form-switch d-inline-flex">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={!!m.activo}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleModActivo(m);
                                }}
                              />
                            </div>
                          </td>
                          <td
                            className="text-end"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              className="btn btn-sm btn-outline-primary me-2"
                              title="Editar"
                              onClick={() => editMod(m)}
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              title="Eliminar"
                              onClick={() => askDelete("mod", m.id, m.nombre)}
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Form Modificador */}
              <hr className="my-3" />
              <h6 className="mb-2">
                {formMod.id ? "Editar modificador" : "Nuevo modificador"}
              </h6>

              <form onSubmit={submitMod}>
                <label className="form-label">Nombre</label>
                <input
                  className="form-control mb-2"
                  value={formMod.nombre}
                  onChange={(e) =>
                    setFormMod((p) => ({ ...p, nombre: e.target.value }))
                  }
                  required
                />

                <div className="d-flex gap-4 flex-wrap my-2">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={!!formMod.requerido}
                      onChange={(e) =>
                        setFormMod((p) => ({
                          ...p,
                          requerido: e.target.checked ? 1 : 0,
                        }))
                      }
                    />
                    <label className="form-check-label">Requerido</label>
                  </div>

                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={!!formMod.multiple}
                      onChange={(e) =>
                        setFormMod((p) => ({
                          ...p,
                          multiple: e.target.checked ? 1 : 0,
                        }))
                      }
                    />
                    <label className="form-check-label">Multiple</label>
                  </div>

                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={!!formMod.activo}
                      onChange={(e) =>
                        setFormMod((p) => ({
                          ...p,
                          activo: e.target.checked ? 1 : 0,
                        }))
                      }
                    />
                    <label className="form-check-label">Activo</label>
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button className="btn btn-primary">
                    {formMod.id ? "Actualizar" : "Crear"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={resetMod}
                  >
                    Limpiar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Derecha: opciones */}
        <div className="col-12 col-lg-7">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <h6 className="mb-0">Opciones</h6>
                  <small className="text-muted">
                    {selected ? (
                      <>
                        Modificador: <b>{selected.nombre}</b>
                      </>
                    ) : (
                      "Selecciona un modificador"
                    )}
                  </small>
                </div>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={resetOp}
                  disabled={!selectedId}
                >
                  <FaPlus className="me-1" /> Nueva opción
                </button>
              </div>

              <div
                style={{
                  maxHeight: "40vh",
                  overflow: "auto",
                  borderRadius: 10,
                }}
              >
                <table className="table table-hover align-middle mb-0">
                  <thead
                    className="table-light"
                    style={{ position: "sticky", top: 0, zIndex: 2 }}
                  >
                    <tr>
                      <th>Opción</th>
                      <th className="text-end" style={{ width: 120 }}>
                        Extra
                      </th>
                      <th className="text-center" style={{ width: 90 }}>
                        Activo
                      </th>
                      <th className="text-end" style={{ width: 130 }}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedId && opc.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-4">
                          Sin opciones.
                        </td>
                      </tr>
                    ) : (
                      opc.map((o) => (
                        <tr key={o.id}>
                          <td className="fw-semibold">{o.nombre}</td>
                          <td className="text-end">{money(o.precio_extra)}</td>
                          <td className="text-center">
                            <div className="form-check form-switch d-inline-flex">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={!!o.activo}
                                onChange={() => toggleOpActivo(o)}
                              />
                            </div>
                          </td>
                          <td className="text-end">
                            <button
                              className="btn btn-sm btn-outline-primary me-2"
                              title="Editar"
                              onClick={() => editOp(o)}
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              title="Eliminar"
                              onClick={() => askDelete("op", o.id, o.nombre)}
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <hr className="my-3" />

              <h6 className="mb-2">
                {formOp.id ? "Editar opción" : "Nueva opción"}
              </h6>
              <form onSubmit={submitOp}>
                <div className="row g-2">
                  <div className="col-12 col-md-6">
                    <label className="form-label">Nombre</label>
                    <input
                      className="form-control"
                      value={formOp.nombre}
                      onChange={(e) =>
                        setFormOp((p) => ({ ...p, nombre: e.target.value }))
                      }
                      required
                      disabled={!selectedId}
                    />
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label">Precio extra</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={formOp.precio_extra}
                      onChange={(e) =>
                        setFormOp((p) => ({
                          ...p,
                          precio_extra: e.target.value,
                        }))
                      }
                      disabled={!selectedId}
                    />
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label">Orden</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formOp.orden}
                      onChange={(e) =>
                        setFormOp((p) => ({ ...p, orden: e.target.value }))
                      }
                      placeholder="auto"
                      disabled={!selectedId}
                    />
                  </div>
                </div>

                <div className="d-flex gap-4 flex-wrap my-2">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={!!formOp.activo}
                      onChange={(e) =>
                        setFormOp((p) => ({
                          ...p,
                          activo: e.target.checked ? 1 : 0,
                        }))
                      }
                      disabled={!selectedId}
                    />
                    <label className="form-check-label">Activo</label>
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button className="btn btn-primary" disabled={!selectedId}>
                    {formOp.id ? "Actualizar" : "Crear"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={resetOp}
                    disabled={!selectedId}
                  >
                    Limpiar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <ModalConfirm
        show={confirm.show}
        title={
          confirm.type === "mod" ? "Eliminar modificador" : "Eliminar opción"
        }
        message={
          <>
            ¿Seguro que deseas eliminar <b>{confirm.nombre}</b>? <br />
            Esta acción no se puede deshacer.
          </>
        }
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        confirmVariant="danger"
        icon={<FaExclamationTriangle />}
        loading={loadingConfirm}
        onCancel={() =>
          !loadingConfirm &&
          setConfirm({ show: false, type: "", id: null, nombre: "" })
        }
        onConfirm={doDelete}
      />
    </div>
  );
}
