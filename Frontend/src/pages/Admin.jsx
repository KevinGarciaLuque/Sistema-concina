import LayoutBS from "../components/LayoutBS";

export default function Admin() {
  return (
    <LayoutBS title="Dashboard Admin">
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <h4 className="fw-bold mb-1">Bienvenido Administrador</h4>
          <p className="text-muted mb-4">
            Aquí vamos a poner reportes por día/mes/año.
          </p>

          <div className="row g-3">
            <div className="col-12 col-md-6 col-xl-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="text-muted" style={{ fontSize: 13 }}>Órdenes hoy</div>
                      <div className="display-6 fw-bold mb-0">—</div>
                    </div>
                    <span className="badge text-bg-dark">HOY</span>
                  </div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    Pendiente de reportes
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6 col-xl-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="text-muted" style={{ fontSize: 13 }}>Ventas hoy</div>
                      <div className="display-6 fw-bold mb-0">—</div>
                    </div>
                    <span className="badge text-bg-success">CAJA</span>
                  </div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    Pendiente de facturas
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6 col-xl-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="text-muted" style={{ fontSize: 13 }}>Órdenes mes</div>
                      <div className="display-6 fw-bold mb-0">—</div>
                    </div>
                    <span className="badge text-bg-primary">MES</span>
                  </div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    Pendiente de reportes
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="my-4" />

          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h6 className="fw-bold mb-2">Accesos rápidos</h6>
                  <div className="d-flex gap-2 flex-wrap">
                    <a className="btn btn-dark" href="/pos">Ir a POS</a>
                    <a className="btn btn-outline-dark" href="/cocina">Ir a Cocina</a>
                  </div>
                  <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                    Luego lo mejoramos con botones internos y permisos.
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h6 className="fw-bold mb-2">Próximo a implementar</h6>
                  <ul className="mb-0 text-muted" style={{ fontSize: 14 }}>
                    <li>Total órdenes por día/mes/año</li>
                    <li>Total facturas por día/mes/año</li>
                    <li>Top productos vendidos</li>
                    <li>Métodos de pago</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </LayoutBS>
  );
}
