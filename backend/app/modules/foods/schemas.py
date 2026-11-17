from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class BasisSchema(BaseModel):
    amount: float = Field(100.0, gt=0, description="Reference basis amount, typically 100")
    unit: str = Field("g", description="Base unit: 'g' or 'ml'")

class NutrientsSchema(BaseModel):
    energyKcal: Optional[float] = Field(None, ge=0, description="Energy in kilocalories")
    proteinG: Optional[float] = Field(None, ge=0, description="Protein in grams")
    carbohydrateG: Optional[float] = Field(None, ge=0, description="Carbohydrates in grams")
    fatG: Optional[float] = Field(None, ge=0, description="Total fat in grams")
    fiberG: Optional[float] = Field(None, ge=0, description="Dietary fiber in grams")
    sugarsG: Optional[float] = Field(None, ge=0, description="Total sugars in grams")
    sodiumMg: Optional[float] = Field(None, ge=0, description="Sodium in milligrams")

class ServingDefinition(BaseModel):
    name: str = Field(..., description="Serving name, e.g. '1 cup', '1 slice', '1 medium'")
    grams: float = Field(..., gt=0, description="Gram equivalent for this specific food")

class SourceProvenance(BaseModel):
    name: str = Field("Standard Food Data", description="Provenance source name")
    referenceId: Optional[str] = None
    retrievalDate: Optional[datetime] = None

class FoodCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    brand: Optional[str] = Field(None, max_length=150)
    barcode: Optional[str] = Field(None, max_length=50)
    categoryId: str = Field(..., description="ObjectId string of the category")
    basis: BasisSchema = BasisSchema()
    nutrients: NutrientsSchema
    servings: List[ServingDefinition] = []
    source: SourceProvenance = SourceProvenance()
    verificationStatus: str = Field("verified", description="verified, unverified, pending_review")

class FoodUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    brand: Optional[str] = None
    barcode: Optional[str] = None
    categoryId: Optional[str] = None
    basis: Optional[BasisSchema] = None
    nutrients: Optional[NutrientsSchema] = None
    servings: Optional[List[ServingDefinition]] = None
    verificationStatus: Optional[str] = None

class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None

class FoodResponse(BaseModel):
    id: str
    name: str
    normalizedName: str
    brand: Optional[str] = None
    barcode: Optional[str] = None
    categoryId: str
    categoryName: Optional[str] = "General"
    basis: BasisSchema
    nutrients: NutrientsSchema
    servings: List[ServingDefinition] = []
    source: SourceProvenance
    verificationStatus: str
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

class FoodListResponse(BaseModel):
    foods: List[FoodResponse]
    total: int
    page: int
    limit: int
    totalPages: int

class CSVImportResult(BaseModel):
    totalRows: int
    importedCount: int
    skippedDuplicates: int
    errors: List[Dict[str, Any]]
