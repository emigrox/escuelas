from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from datetime import datetime
import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.core.database import get_db
from app.models.models import ComprobanteMantenimiento, OrdenProvision, Escuela, Empresa, User
from app.schemas.schemas import ComprobanteCreate, ComprobanteResponse
from app.api.routes_auth import get_current_user

router = APIRouter(prefix="/comprobantes", tags=["Comprobantes & Certificados (Fase 2)"])

@router.post("/generar", response_model=ComprobanteResponse)
def crear_comprobante(
    datos: ComprobanteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    orden = db.query(OrdenProvision).filter(OrdenProvision.id == datos.orden_id).first()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden de provisión no encontrada")

    nro = f"CERT-{datetime.utcnow().year}-{orden.id:05d}"
    comp = ComprobanteMantenimiento(
        nro_comprobante=nro,
        orden_id=orden.id,
        monto_certificado=datos.monto_certificado,
        observaciones=datos.observaciones,
        creado_por_id=current_user.id,
        estado="Certificado"
    )
    db.add(comp)
    db.commit()
    db.refresh(comp)
    return comp

@router.get("/imprimir/{comprobante_id}")
def imprimir_comprobante_pdf(comprobante_id: int, db: Session = Depends(get_db)):
    comp = db.query(ComprobanteMantenimiento).filter(ComprobanteMantenimiento.id == comprobante_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado")

    orden = comp.orden
    escuela = orden.escuela if orden else None
    empresa = orden.empresa if orden else None

    # Generación en memoria con ReportLab
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    elements = []
    styles = getSampleStyleSheet()

    # Encabezado
    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=16, textColor=colors.HexColor('#0f172a'), alignment=1)
    subtitle_style = ParagraphStyle('SubTitleStyle', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#64748b'), alignment=1)

    elements.append(Paragraph("GOBIERNO DE LA PROVINCIA DE CORRIENTES", title_style))
    elements.append(Paragraph("MINISTERIO DE EDUCACIÓN - DIRECCIÓN DE INFRAESTRUCTURA ESCOLAR", subtitle_style))
    elements.append(Spacer(1, 15))

    elements.append(Paragraph(f"<b>CERTIFICADO OFICIAL DE MANTENIMIENTO:</b> {comp.nro_comprobante}", styles['Heading2']))
    elements.append(Paragraph(f"Fecha de Emisión: {comp.fecha_emision.strftime('%d/%m/%Y')} | Estado: {comp.estado}", styles['Normal']))
    elements.append(Spacer(1, 15))

    # Tabla de Datos
    data_info = [
        ["Establecimiento:", escuela.nombre if escuela else "N/A", "CUE:", escuela.cue if escuela else "N/A"],
        ["Departamento:", escuela.departamento if escuela else "N/A", "Localidad:", escuela.localidad if escuela else "N/A"],
        ["Empresa Contratista:", empresa.razon_social if empresa else "N/A", "CUIT:", empresa.cuit if empresa else "N/A"],
        ["Orden de Provisión:", orden.nro_orden if orden else "N/A", "Ejercicio:", str(orden.ejercicio) if orden else "2026"],
        ["Monto Certificado:", f"${comp.monto_certificado:,.2f}", "Rubro:", orden.rubro if orden else "General"]
    ]

    t = Table(data_info, colWidths=[120, 160, 80, 180])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor('#1e293b')),
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTNAME', (2,0), (2,-1), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 20))

    elements.append(Paragraph("<b>Descripción / Observaciones Técnicas:</b>", styles['Heading3']))
    elements.append(Paragraph(comp.observaciones or orden.descripcion or "Mantenimiento preventivo y correctivo según pliego de bases y condiciones.", styles['Normal']))
    elements.append(Spacer(1, 50))

    # Firmas
    firmas = [
        ["___________________________________", "___________________________________"],
        ["Firma del Inspector / Auditor Técnico", "Firma y Sello de la Dirección Escolar"]
    ]
    t_firmas = Table(firmas, colWidths=[270, 270])
    t_firmas.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTSIZE', (0,1), (-1,1), 9),
        ('TEXTCOLOR', (0,1), (-1,1), colors.HexColor('#64748b'))
    ]))
    elements.append(t_firmas)

    doc.build(elements)
    buffer.seek(0)
    pdf_bytes = buffer.getvalue()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={comp.nro_comprobante}.pdf"}
    )
