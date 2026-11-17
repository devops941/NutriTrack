import React from 'react';
import { LucideIcon, Wrench } from 'lucide-react';

interface ModulePlaceholderProps {
  title: string;
  description: string;
  phase: string;
  icon?: LucideIcon;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  title,
  description,
  phase,
  icon: Icon = Wrench,
}) => {
  return (
    <div className="bg-white rounded-2xl p-8 border border-mutedGrey-border shadow-organic text-center max-w-xl mx-auto my-12">
      <div className="w-14 h-14 bg-forest-50 text-forest rounded-2xl flex items-center justify-center mx-auto mb-4 border border-sage/40">
        <Icon className="w-7 h-7" />
      </div>
      <span className="text-xs font-semibold uppercase tracking-wider text-forest bg-forest-50 px-3 py-1 rounded-full border border-sage/40">
        Scheduled for {phase}
      </span>
      <h2 className="text-xl font-bold font-editorial text-charcoal mt-4 mb-2">
        {title}
      </h2>
      <p className="text-sm text-mutedGrey leading-relaxed">
        {description}
      </p>
    </div>
  );
};
