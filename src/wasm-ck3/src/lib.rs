use ck3save::{models::HeaderOwned, Ck3Error, Ck3File, Encoding, FailedResolveStrategy};
use serde::Serialize;
use wasm_bindgen::prelude::*;

mod tokens;
pub use tokens::*;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Ck3Metadata {
    version: String,
    is_meltable: bool,
}

pub struct SaveFileImpl {
    header: HeaderOwned,
    encoding: Encoding,
}

#[wasm_bindgen]
pub struct SaveFile(SaveFileImpl);

#[wasm_bindgen]
impl SaveFile {
    pub fn metadata(&self) -> JsValue {
        JsValue::from_serde(&self.0.metadata()).unwrap()
    }
}

impl SaveFileImpl {
    pub fn metadata(&self) -> Ck3Metadata {
        Ck3Metadata {
            version: self.header.meta_data.version.clone(),
            is_meltable: self.is_meltable(),
        }
    }

    fn is_meltable(&self) -> bool {
        matches!(self.encoding, Encoding::Binary | Encoding::BinaryZip)
    }
}

fn _parse_save(data: &[u8]) -> Result<SaveFile, Ck3Error> {
    let file = Ck3File::from_slice(data)?;
    let meta = file.parse_metadata()?;
    let header = meta.deserializer(tokens::get_tokens()).deserialize()?;
    Ok(SaveFile(SaveFileImpl {
        header,
        encoding: file.encoding(),
    }))
}

#[wasm_bindgen]
pub fn parse_save(data: &[u8]) -> Result<SaveFile, JsValue> {
    let s = _parse_save(data).map_err(|e| JsValue::from_str(e.to_string().as_str()))?;
    Ok(s)
}

fn _melt(data: &[u8]) -> Result<ck3save::MeltedDocument, Ck3Error> {
    let file = Ck3File::from_slice(data)?;
    let mut zip_sink = Vec::new();
    let parsed_file = file.parse(&mut zip_sink)?;
    let binary = parsed_file.as_binary().unwrap();
    let out = binary
        .melter()
        .on_failed_resolve(FailedResolveStrategy::Ignore)
        .melt(tokens::get_tokens())?;
    Ok(out)
}

#[wasm_bindgen]
pub fn melt(data: &[u8]) -> Result<js_sys::Uint8Array, JsValue> {
    _melt(data)
        .map(|x| js_sys::Uint8Array::from(x.data()))
        .map_err(|e| JsValue::from_str(e.to_string().as_str()))
}
