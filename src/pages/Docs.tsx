import React from 'react';
import {
  BookOpen,
  ShieldCheck,
  Sparkles,
  Layers,
  ArrowRightLeft,
  AlertOctagon,
  HeartHandshake,
  FileCheck,
  CheckCircle2,
  Terminal,
} from 'lucide-react';

export const Docs: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 text-slate-800">
      {/* Hero Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
          <BookOpen className="w-4 h-4" />
          MedExpiry Knowledge Base &amp; System Manual
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Standard Operating Procedures (SOP) &amp; Architecture Manual
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Comprehensive operational guidelines for pharmacists, storekeepers, and healthcare administrators.
        </p>
      </div>

      {/* Safety Notice Banner */}
      <div className="bg-amber-50/90 border border-amber-200/90 p-4 rounded-xl flex items-start gap-3 text-xs text-amber-950">
        <HeartHandshake className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-amber-900">Clinical Decision Support Disclaimer:</strong>
          <p className="mt-0.5 leading-relaxed text-amber-800">
            MedExpiry is strictly an inventory management, batch lifecycle tracking, and expiry control system.
            It does not offer clinical diagnostics, dosage prescribing, or patient-specific treatment evaluations.
            All medicine dispensing must follow licensed physician orders and hospital formulary guidelines.
          </p>
        </div>
      </div>

      {/* Module 1: FEFO Algorithm Specification */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
          <Sparkles className="w-5 h-5" />
          <h2>First-Expiry-First-Out (FEFO) Protocol Specification</h2>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Standard FIFO (First-In, First-Out) models operate on arrival timestamps, which frequently causes medicine
          batches with shorter manufacturer shelf-lives to expire while sitting on the shelf behind newer arrivals.
          MedExpiry enforces <strong>First-Expiry-First-Out (FEFO)</strong>:
        </p>

        <div className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs space-y-1.5 border border-slate-800">
          <div className="text-emerald-400 font-bold">// FEFO Candidate Sorting Criteria</div>
          <div>1. Filter batches WHERE medicineId = :target AND quantity &gt; 0</div>
          <div>2. Exclude batches WHERE isExpired = true OR expiryDate &lt; CURRENT_DATE</div>
          <div>3. SORT candidate batches ASCENDING by expiryDate (earliest expiration timestamp first)</div>
          <div>4. Recommend Rank #1 batch for clinical dispensing</div>
          <div>5. Require staff override acknowledgement if any later-expiring batch is selected</div>
        </div>
      </div>

      {/* Module 2: Workflow Lifecycle */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            1
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Stock Reception (Inward)</h3>
          <p className="text-slate-600 leading-relaxed">
            Upon delivery from verified distributors, staff record batch number, manufacturing date, and expiry date.
            Stock values and storage location tags are assigned instantly.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            2
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Dispensing (Outward)</h3>
          <p className="text-slate-600 leading-relaxed">
            During prescription fulfillment or ward transfer, the FEFO engine flags the optimal batch.
            Expired batches are physically locked from the dispense flow.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-700 flex items-center justify-center font-bold">
            3
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Quarantine &amp; Disposal</h3>
          <p className="text-slate-600 leading-relaxed">
            Batches crossing the expiry date are segregated into quarantine. Certified disposal records witness signatures
            and generate financial loss balance sheets.
          </p>
        </div>
      </div>

      {/* Module 3: Security & Auditability */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
          <ShieldCheck className="w-5 h-5" />
          <h2>Regulatory Compliance &amp; Audit Traceability</h2>
        </div>

        <p className="text-slate-600 leading-relaxed">
          Designed in alignment with <strong>Good Pharmacy Practice (GPP)</strong> and WHO Technical Report Series No. 961 guidelines:
        </p>

        <ul className="space-y-2 list-disc list-inside text-slate-700">
          <li><strong>Role-Based Access Control (RBAC):</strong> Separates daily dispensing staff from administrative supervisors.</li>
          <li><strong>Immutable Audit Ledger:</strong> Every transaction logs actor name, client IP, precise timestamp, and JSON delta state.</li>
          <li><strong>Zero-Loss Waste Accounting:</strong> Real-time monitoring of cost loss versus retail potential.</li>
          <li><strong>CSV Compliance Export:</strong> One-click export of expiry logs for state pharmacy board inspections.</li>
        </ul>
      </div>

      {/* Quick Credentials Card */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
        <div>
          <div className="font-bold text-sm text-emerald-400">Pre-configured Demo Access Credentials</div>
          <div className="text-slate-400 mt-0.5">
            Admin: <code className="text-white font-mono">admin@medexpiry.com</code> (pw: <code className="text-white font-mono">admin123</code>)
          </div>
          <div className="text-slate-400 mt-0.5">
            Staff: <code className="text-white font-mono">staff@medexpiry.com</code> (pw: <code className="text-white font-mono">staff123</code>)
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-mono">
          Status: Engine Healthy &amp; Ready
        </div>
      </div>
    </div>
  );
};
