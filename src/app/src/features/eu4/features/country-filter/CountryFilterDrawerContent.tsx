import React, { useState } from "react";
import { Button, Divider } from "antd";
import {
  useCountryFilterDispatch,
  useCountryFilterState,
} from "./countryFilterContext";
import { CountryFilterForm } from "./CountryFilterForm";
import { CountrySelect } from "../../components/country-select";
import { useEu4Actions } from "../../Eu4SaveProvider";

interface CountryFilterDrawerContent {
  closeDrawer: () => void;
}

export const CountryFilterDrawerContent = ({
  closeDrawer,
}: CountryFilterDrawerContent) => {
  const { updateTagFilter } = useEu4Actions();
  const [forceShowFiltered, setForceShowFiltered] = useState(false);
  const filter = useCountryFilterState();
  const localDispatch = useCountryFilterDispatch();
  const manySelectedTags = filter.countries.length > 50;

  return (
    <>
      <Divider orientation="left">{`Computed Selection (${filter.countries.length})`}</Divider>
      <div style={{ height: "150px" }}>
        {!forceShowFiltered && manySelectedTags && (
          <Button
            type="link"
            onClick={() => setForceShowFiltered(true)}
          >{`Show all ${filter.countries.length} selected countries`}</Button>
        )}
        {(forceShowFiltered || !manySelectedTags) && (
          <CountrySelect
            ai="all"
            mode="multiple"
            value={filter.countries.map((x) => x.tag)}
            allowClear
            style={{ width: "100%", maxHeight: "150px", overflow: "auto" }}
            onDeselect={(input: any) =>
              localDispatch({ kind: "exclude-tag", tag: input as string })
            }
            onSelect={(input: any) =>
              localDispatch({ kind: "include-tag", tag: input as string })
            }
          />
        )}
      </div>
      <Divider orientation="left">Options</Divider>
      <CountryFilterForm
        initialValues={filter.matcher}
        onChange={(x) => {
          closeDrawer();
          updateTagFilter(x);
        }}
      />
    </>
  );
};
