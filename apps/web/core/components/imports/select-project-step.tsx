/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Button } from "@plane/propel/button";
// components
import { ProjectDropdown } from "@/components/dropdowns/project/dropdown";

type Props = {
  projectId: string | null;
  onChange: (projectId: string) => void;
  onNext: () => void;
};

export function SelectProjectStep(props: Props) {
  const { projectId, onChange, onNext } = props;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h4 className="text-13 font-medium text-primary">Select a project</h4>
        <p className="text-12 text-tertiary">Work items parsed from the CSV will be created in this project.</p>
      </div>
      <div className="w-64">
        <ProjectDropdown
          multiple={false}
          value={projectId}
          onChange={onChange}
          buttonVariant="border-with-text"
          placeholder="Choose a project"
          dropdownArrow
        />
      </div>
      <div>
        <Button variant="primary" size="sm" disabled={!projectId} onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
