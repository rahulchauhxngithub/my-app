"use client";

import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { Camera, Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { addCar, processCarImageWithAI } from '@/actions/cars';
import useFetch from '@/hooks/use-fetch';
import { useRouter } from 'next/navigation';

const fuelTypes = ["Petrol", "Diesel", "Electric", "Hybrid", "Hydrogen", "CNG", "Plug-in Hybrid", "Ethanol", "Biodiesel", "Biofuel", "Compressed Natural Gas"];
const transmission = ["Automatic", "Manual", "Semi-Automatic", "CVT", "Dual-Clutch", "Tiptronic", "Sequential", "Electric Drive"];
const bodyTypes = ["Sedan", "Hatchback", "SUV", "Coupe", "Convertible", "Wagon", "Pickup Truck", "Van", "Minivan", "Crossover"];
const carStatuses = ["Available", "Sold", "Reserved", "Pending", "In Service", "In Transit", "In Stock", "Pre-Order"];

const AddCarForm = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("manual");
  const [uploadedImages, setUploadedImages] = useState([]);
  const [imageError, setImageError] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const[uploadedAiImage, setUploadedAiImage] = useState(null);

  const carFormSchema = z.object({
    make: z.string().min(1, "Make is required"),
    model: z.string().min(1, "Model is required"),
    year: z.string().refine((val) => {
      const year = parseInt(val);
      return (
        !isNaN(year) && year >= 1900 && year <= new Date().getFullYear() + 1
      );
    }, "Year must be a valid number between 1900 and next year"),
    price: z.coerce.number().min(1, "Price is required"),
    mileage: z.coerce.number().min(0, "Mileage is required"),
    fuelType: z.enum(fuelTypes, "Fuel type is required"),
    transmission: z.enum(transmission, "Transmission type is required"),
    bodyType: z.enum(bodyTypes, "Body type is required"),
    color: z.string().min(1, "Color is required"),
    seats: z.string().optional(),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters long")
      .max(500, "Description must be at most 500 characters long"),
    status: z.enum(carStatuses),
    featured: z.boolean().default(false),
  });

  const { register, setValue, getValues, formState: { errors }, handleSubmit, watch } = useForm({
    resolver: zodResolver(carFormSchema),
    defaultValues: {
      make: "",
      model: "",
      year: "",
      price: 0,
      mileage: 0,
      fuelType: fuelTypes[0],
      transmission: transmission[0],
      bodyType: bodyTypes[0],
      color: "",
      seats: "",
      description: "",
      status: carStatuses[0],
      featured: false,
    },
  });

  const onAiDrop = (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error("File size must be less than 5 MB");
          return;
        }
        setUploadedAiImage(file);
        
  
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target.result);
          
          toast.success("Image uploaded successfully");
        };
  
        
        reader.readAsDataURL(file);
      }
    };

  const { getRootProps: getAiRootProps, getInputProps: getAiInputProps } = useDropzone({
    onDrop: onAiDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles: 1,
    multiple: false,
  });

  const{
    loading: processImageLoading,
    fn: processImageFn,
    data: processImageResult,
    error: processImageError

  } =useFetch(processCarImageWithAI);

  const processWithAi = async () => {
    if (!uploadedAiImage) {
      toast.error("Please upload an image to process");
      return;
    }

    const formData = new FormData();
    formData.append("image", uploadedAiImage); // Ensure the key is "image"

    await processImageFn(formData);
  };

  useEffect(()=>{
    if(processImageError){
      toast.error(processImageError.message || "Something went wrong while processing the image");
      return;
    }
  },[processImageError]);

  useEffect(()=>{
    if(processImageResult?.success){
      const carDetails = processImageResult.data;
      setValue("make", carDetails.make);
      setValue("model", carDetails.model);
      setValue("year", carDetails.year.toString());
      setValue("price", carDetails.price);
      setValue("mileage", carDetails.mileage);
      setValue("fuelType", carDetails.fuelType);
      setValue("transmission", carDetails.transmission);
      setValue("bodyType", carDetails.bodyType);
      setValue("color", carDetails.color);
      setValue("seats", carDetails.seats);
      setValue("description", carDetails.description);
      //setValue("status", carDetails.status);
      //setValue("featured", carDetails.featured);

      const reader= new FileReader();
      reader.onload=(e)=>{
        setUploadedImages((prev)=>[...prev,e.target.result]);
      };
      reader.readAsDataURL(uploadedAiImage);
      toast.success("Car details extracted successfully",{
        description: `Detected ${carDetails.make} ${carDetails.model} ${carDetails.year} with ${Math.round(carDetails.confidence * 100)}% confidence`,
    });

    setActiveTab("manual");


    }

  },[processImageResult,uploadedAiImage]);

  const {data: addCarResult, loading: addCarLoading, fn: addCarFn} = useFetch(addCar);

  useEffect(() => {
    if(addCarResult?.success){
      toast.success("Car added successfully");
      router.push("/admin/cars");
    }
  }, [addCarResult, addCarLoading]);

  const onSubmit = async (data) => {
    if(uploadedImages.length === 0) {
      setImageError("Please upload at least one image");
      return;
    }
    // Handle form submission
    const carData = {
      ...data,
      year: parseInt(data.year),
      seats: data.seats ? parseInt(data.seats) : null,
    };
    await addCarFn({ carData, images: uploadedImages });
  };

  const onMultiImageDrop = (acceptedFiles) => {
    const validFiles = acceptedFiles.filter((file) => {
      if(file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max size is 5MB`);
        return false;
      }
      return true;
    });
    
    if(validFiles.length === 0) 
      return;
      
    const newImages = [];
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newImages.push(e.target.result);
        if(newImages.length === validFiles.length) {
          setUploadedImages((prev) => [...prev, ...newImages]);
          setImageError("");
          toast.success(`Successfully uploaded ${validFiles.length} images`);  
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const { getRootProps: getMultiImageRootProps, getInputProps: getMultiImageInputProps } = useDropzone({
    onDrop: onMultiImageDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    multiple: true,
  });

  const removeImage = (index) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      <Tabs defaultValue="manual" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="ai">AI Upload</TabsTrigger>
        </TabsList>
        <TabsContent value="manual" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Car Details</CardTitle>
              <CardDescription>Enter the details of the car you want to add</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'> 
                  <div className='space-y-2'>
                    <Label htmlFor='make'>Make</Label>
                    <Input id='make'
                    {...register("make")}
                    placeholder='e.g. Toyota'
                    className={errors.make ? "border-red-500" : ""}
                    />
                    {errors.make && <p className='text-red-500'>{errors.make.message}</p>}
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='model'>Model</Label>
                    <Input id='model'
                    {...register("model")}
                    placeholder='e.g. Camry'
                    className={errors.model ? "border-red-500" : ""}
                    />
                    {errors.model && <p className='text-red-500'>{errors.model.message}</p>}
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='year'>Year</Label>
                    <Input id='year'
                    {...register("year")}
                    placeholder='e.g. 2023'
                    className={errors.year ? "border-red-500" : ""}
                    />
                    {errors.year && <p className='text-red-500'>{errors.year.message}</p>}
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='price'>Price</Label>
                    <Input
                    type="number"
                    id='price'
                    {...register("price", { valueAsNumber: true })}
                    placeholder='e.g. 30000'
                    className={errors.price ? "border-red-500" : ""}
                    />
                    {errors.price && <p className='text-red-500'>{errors.price.message}</p>}
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='mileage'>Mileage</Label>
                    <Input 
                    type="number"
                    id='mileage'
                    {...register("mileage", { valueAsNumber: true })}
                    placeholder='e.g. 25'
                    className={errors.mileage ? "border-red-500" : ""}
                    />
                    {errors.mileage && <p className='text-red-500'>{errors.mileage.message}</p>}
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='color'>Color</Label>
                    <Input id='color'
                    {...register("color")}
                    placeholder='e.g. Red'
                    className={errors.color ? "border-red-500" : ""}
                    />
                    {errors.color && <p className='text-red-500'>{errors.color.message}</p>}
                  </div>


                  <div className='space-y-2'>
                    <Label htmlFor='fuelType'>Fuel Type</Label>
                    <Select onValueChange={(value) => setValue("fuelType", value)} defaultValue={getValues("fuelType")}>
                      <SelectTrigger className={errors.fuelType ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select the fuel type" />
                      </SelectTrigger>
                      <SelectContent>
                        {fuelTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.fuelType && <p className='text-red-500'>{errors.fuelType.message}</p>}
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='transmission'>Transmission</Label>
                    <Select onValueChange={(value) => setValue("transmission", value)} defaultValue={getValues("transmission")}>
                      <SelectTrigger className={errors.transmission ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select the transmission" />
                      </SelectTrigger>
                      <SelectContent>
                        {transmission.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.transmission && <p className='text-red-500'>{errors.transmission.message}</p>}
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='bodyType'>Body Type</Label>
                    <Select onValueChange={(value) => setValue("bodyType", value)} defaultValue={getValues("bodyType")}>
                      <SelectTrigger className={errors.bodyType ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select the body type" />
                      </SelectTrigger>
                      <SelectContent>
                        {bodyTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.bodyType && <p className='text-red-500'>{errors.bodyType.message}</p>}
                  </div>


                  <div className='space-y-2'>
                    <Label htmlFor='seats'>Number of Seats{""}
                    <span className='text-sm text-gray-500'>(Optional)</span>
                    </Label>
                    <Input id='seats'
                    {...register("seats")}
                    placeholder='e.g. 5'
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='status'>Status</Label>
                    <Select onValueChange={(value) => setValue("status", value)} defaultValue={getValues("status")}>
                      <SelectTrigger className={errors.status ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select the status" />
                      </SelectTrigger>
                      <SelectContent>
                        {carStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0) + status.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.status && <p className='text-red-500'>{errors.status.message}</p>}
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='description'>Description</Label>
                  <Textarea id='description'
                  {...register("description")}
                  placeholder='e.g. This is a great car!'
                  className={`min-h-32 ${errors.description ? "border-red-500" : ""}`}
                  />
                  {errors.description && <p className='text-red-500'>{errors.description.message}</p>}
                </div>
                <div className='flex items-start space-x-3 space-y-0 rounded-md border p-4'>
                  <Checkbox
                    checked={watch("featured")}
                    onCheckedChange={(checked) => {setValue("featured", checked);}}
                  />
                  <div className='space-y-1 leading-none'>
                    <Label htmlFor="featured">Feature this Car</Label>
                    <p className='text-sm text-gray-500'>Featured Car appears on the homepage</p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="images" className={imageError ? "text-red-500": ""}>Images{""} {imageError && <span className='text-red-500'>*</span>}</Label>
                  <div {...getMultiImageRootProps()} className='cursor-pointer border-2 border-dashed rounded-md p-6 text-center'>
                    <input {...getMultiImageInputProps()} />
                    <div className='flex flex-col items-center'>
                      <Upload className='h-12 w-12 text-gray-400 mb-2' />
                      <p className='text-gray-600 mb-2'>
                        Drag and drop or click to upload multiple images
                      </p>
                      <p className="text-gray-400 text-sm">
                        (JPG, PNG, WEBP) (max 5MB each)
                      </p>
                    </div>
                  </div>
                  {imageError && (<p className='text-red-500 mt-1'>{imageError}</p>)}
                </div>

                {uploadedImages.length > 0 && (
                  <div className='mt-4'>
                    <h3 className='text-lg font-semibold mb-2'>
                      Uploaded Images ({uploadedImages.length})
                    </h3>
                    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
                      {uploadedImages.map((image, index) => (
                        <div key={index} className='relative group'>
                          <div className='h-20 w-20 overflow-hidden rounded-md'>
                            <Image
                              src={image}
                              alt={`Uploaded Image ${index + 1}`}
                              height={80}
                              width={80}
                              className='h-full w-full object-cover rounded-md'
                              priority
                            />
                          </div>
                          <Button 
                            type="button"
                            size="icon"
                            variant="destructive"
                            className='absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
                            onClick={() => removeImage(index)}
                          >
                            <X className='h-3 w-3'/>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <Button type="submit" className="w-full md:w-auto" >
                    {addCarLoading ? <><Loader2 className='mr-2 h-4 w-4 animate-spin'/> Adding Car...</>:"Add Car"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="ai" className="mt-6">
  <Card>
    <CardHeader>
      <CardTitle>AI powered car details extraction</CardTitle>
      <CardDescription>Upload an image of a car and let saarthAI extract its details</CardDescription>
    </CardHeader>
    <CardContent>
      <div className='space-y-6'>
        <div className='border-2 border-dashed border-gray-400 rounded-lg p-6 text-center'>
          {imagePreview ? (
            <div className='flex flex-col items-center space-y-4'>
              <img 
                src={imagePreview}
                alt='Car preview'
                className='max-h-56 max-w-full object-contain'  
              />
              <div className='flex gap-2'>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImagePreview(null);
                    setUploadedAiImage(null);
                    toast.info("Image removed");
                  }}
                >
                  Remove
                </Button>
                <Button
                  size="sm"
                  onClick={processWithAi}
                  disabled={processImageLoading}
                >
                  {processImageLoading ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Camera className='mr-2 h-4 w-4' />
                      Extract Details
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div {...getAiRootProps()} className='cursor-pointer hover:bg-gray-50 transition'>
              <input {...getAiInputProps()} />
              <div className='flex flex-col items-center justify-center'>
                <Camera className='h-12 w-12 text-gray-400 mb-2' />
                <p className='text-gray-600 text-sm'>
                  Drag and drop or click to upload an image of a car
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Supports: JPG, PNG, Webp (max 5MB)
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="font-medium mb-2">How it works</h3>
          <ol className="space-y-2 text-sm text-gray-600 list-decimal pl-4">
            <li>Upload a clear image of the car</li>
            <li>Click "Extract Details" to analyze with Gemini AI</li>
            <li>Review the extracted information</li>
            <li>Fill in any missing details manually</li>
            <li>Add the car to your inventory</li>
          </ol>
        </div>

        <div className="bg-amber-50 p-4 rounded-md">
          <h3 className="font-medium text-amber-800 mb-1">
            Tips for best results
          </h3>
          <ul className="space-y-1 text-sm text-amber-700">
            <li>• Use clear, well-lit images</li>
            <li>• Try to capture the entire vehicle</li>
            <li>• For difficult models, use multiple views</li>
            <li>• Always verify AI-extracted information</li>
          </ul>
        </div>
      </div>
    </CardContent>
  </Card>
</TabsContent>
      </Tabs>
    </div>
  );
};

export default AddCarForm;