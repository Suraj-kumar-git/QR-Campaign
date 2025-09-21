import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Loader2, Upload, X, CalendarIcon, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { format, startOfDay, isBefore } from "date-fns";
import { cn } from "@/lib/utils";

export function CreateCampaignPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    startDate: "",
    endDate: "",
    startTime: "00:00",
    endTime: "23:59",
    scanLimit: "",
    borderStyle: "none" as "thick" | "none",
    targetUrl: "",
  });
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [startDateValue, setStartDateValue] = useState<Date | undefined>();
  const [endDateValue, setEndDateValue] = useState<Date | undefined>();
  const [formTouched, setFormTouched] = useState({
    category: false,
    startDate: false,
    endDate: false,
    startTime: false,
    endTime: false,
  });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [descriptionLength, setDescriptionLength] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    const finalCategory = isAddingNewCategory ? newCategoryName.trim() : formData.category;
    if (!finalCategory) {
      toast({
        title: "Validation Error",
        description: "Please select or enter a category.",
        variant: "destructive",
      });
      return;
    }
    
    // Date and time validation using day-only comparisons
    const now = new Date();
    const todayStart = startOfDay(new Date());
    
    const startDateParsed = startOfDay(new Date(formData.startDate));
    const endDateParsed = startOfDay(new Date(formData.endDate));
    
    if (isBefore(startDateParsed, todayStart)) {
      toast({
        title: "Invalid Start Date",
        description: "Start date cannot be in the past.",
        variant: "destructive",
      });
      return;
    }
    
    if (isBefore(endDateParsed, startDateParsed)) {
      toast({
        title: "Invalid End Date",
        description: "End date must be on or after the start date.",
        variant: "destructive",
      });
      return;
    }
    
    // Time validation for same-day campaigns
    if (startDateParsed.getTime() === todayStart.getTime()) {
      const currentTime = format(now, "HH:mm");
      if (formData.startTime < currentTime) {
        toast({
          title: "Invalid Start Time",
          description: "Start time cannot be earlier than current time for today's campaigns.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Ensure end time is after start time for same-day campaigns
    if (startDateParsed.getTime() === endDateParsed.getTime() && formData.endTime <= formData.startTime) {
      toast({
        title: "Invalid End Time",
        description: "End time must be after start time for same-day campaigns.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      let iconPath = null;
      
      // Upload icon file if provided
      if (iconFile) {
        const formData = new FormData();
        formData.append('icon', iconFile);
        
        const uploadResponse = await fetch('/api/upload/icon', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload icon');
        }
        
        const uploadResult = await uploadResponse.json();
        iconPath = uploadResult.iconPath;
      }
      
      // Prepare campaign data with proper timezone handling
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}:00`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}:00`);
      
      const campaignData = {
        name: formData.name,
        description: formData.description,
        category: finalCategory,
        startDate: startDateTime.toISOString(), // Proper UTC format
        endDate: endDateTime.toISOString(),     // Proper UTC format
        iconPath,
        borderStyle: formData.borderStyle,
        ...(formData.targetUrl && { targetUrl: formData.targetUrl }), // Only include if not empty
      };
      
      // Add scan limit if provided
      if (formData.scanLimit && parseInt(formData.scanLimit) > 0) {
        (campaignData as any).scanLimit = parseInt(formData.scanLimit);
      }

      // Create campaign API call
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include session cookies
        body: JSON.stringify(campaignData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newCampaign = await response.json();
      
      toast({
        title: "Campaign created successfully!",
        description: `"${formData.name}" has been created and deployed instantly. Campaign ID: ${newCampaign.id}`,
      });
      
      // Redirect to QR codes page
      setLocation("/qr");
    } catch (error) {
      console.error('Campaign creation error:', error);
      toast({
        title: "Failed to create campaign",
        description: "An error occurred while creating the campaign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    let value = e.target.value;
    
    // Handle description character limit
    if (field === "description" && value.length > 200) {
      value = value.substring(0, 200);
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Mark field as touched
    if (field in formTouched) {
      setFormTouched(prev => ({ ...prev, [field]: true }));
    }
    
    if (field === "description") {
      setDescriptionLength(value.length);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setIconPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemoveIcon = () => {
    setIconFile(null);
    setIconPreview(null);
  };
  
  const handleBorderStyleChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, borderStyle: checked ? "thick" : "none" }));
  };
  
  const handleCategoryChange = (value: string) => {
    setFormTouched(prev => ({ ...prev, category: true }));
    if (value === "new-category") {
      setIsAddingNewCategory(true);
      setNewCategoryName("");
      setFormData(prev => ({ ...prev, category: "" }));
    } else {
      setIsAddingNewCategory(false);
      setNewCategoryName("");
      setFormData(prev => ({ ...prev, category: value }));
    }
  };
  
  const handleDateSelect = (field: "startDate" | "endDate") => (date: Date | undefined) => {
    if (date) {
      const dateString = format(date, "yyyy-MM-dd");
      setFormData(prev => ({ ...prev, [field]: dateString }));
      setFormTouched(prev => ({ ...prev, [field]: true }));
      
      if (field === "startDate") {
        setStartDateValue(date);
        setStartDateOpen(false);
      } else {
        setEndDateValue(date);
        setEndDateOpen(false);
      }
    }
  };
  
  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/campaigns/categories', {
          credentials: 'include',
        });
        if (response.ok) {
          const categoryData = await response.json();
          setCategories(categoryData);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    
    fetchCategories();
  }, []);
  
  // Date validation helper
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6" data-testid="create-campaign-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="page-title">
            Create New Campaign
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2" data-testid="page-description">
            Design and launch a new marketing campaign to engage your audience.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Main Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Megaphone className="w-5 h-5" />
                <span>Campaign Details</span>
              </CardTitle>
              <CardDescription>
                Fill out the information below to create your campaign.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="create-campaign-form">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Campaign Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange("name")}
                      placeholder="Enter campaign name"
                      required
                      data-testid="input-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    {isAddingNewCategory ? (
                      <div className="space-y-2">
                        <Input
                          type="text"
                          placeholder="Enter new category name"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          required
                          data-testid="input-new-category"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsAddingNewCategory(false);
                              setNewCategoryName("");
                            }}
                            data-testid="button-cancel-new-category"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Select 
                        value={formData.category} 
                        onValueChange={handleCategoryChange}
                        required
                      >
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                          <SelectItem value="new-category">
                            + Add new category
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {!isAddingNewCategory && !formData.category && formTouched.category && (
                      <p className="text-xs text-red-600">
                        Please select a category
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description 
                    <span className="text-sm text-gray-500 font-normal">({descriptionLength}/200)</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={handleChange("description")}
                    placeholder="Describe your campaign goals and messaging (max 200 characters)"
                    rows={3}
                    data-testid="input-description"
                  />
                  {descriptionLength > 180 && (
                    <p className="text-xs text-amber-600">
                      {200 - descriptionLength} characters remaining
                    </p>
                  )}
                </div>

                {/* Custom URL for QR Code */}
                <div className="space-y-2">
                  <Label htmlFor="targetUrl" className="flex items-center gap-2">
                    Custom QR Code URL
                    <span className="text-sm text-gray-500 font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="targetUrl"
                    type="url"
                    value={formData.targetUrl}
                    onChange={handleChange("targetUrl")}
                    placeholder="https://example.com/your-landing-page"
                    data-testid="input-target-url"
                  />
                  <p className="text-xs text-gray-500">
                    When someone scans your QR code, they'll be redirected to this URL. If left empty, they'll see the campaign details page.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scanLimit">Scan Limit (Optional)</Label>
                  <Input
                    id="scanLimit"
                    type="number"
                    value={formData.scanLimit}
                    onChange={handleChange("scanLimit")}
                    placeholder="e.g., 1000 (leave empty for unlimited)"
                    min="1"
                    data-testid="input-scan-limit"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Set a maximum number of scans before the QR code becomes inactive
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iconUpload">QR Code Icon (Optional)</Label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    {iconPreview ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <img 
                            src={iconPreview} 
                            alt="Icon preview" 
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div>
                            <p className="text-sm font-medium">{iconFile?.name}</p>
                            <p className="text-xs text-gray-500">{Math.round((iconFile?.size || 0) / 1024)} KB</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveIcon}
                          data-testid="button-remove-icon"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <div className="mt-2">
                          <Label htmlFor="iconUpload" className="cursor-pointer">
                            <span className="text-blue-600 hover:text-blue-500">Upload an icon</span>
                            <span className="text-gray-500"> or drag and drop</span>
                          </Label>
                          <Input
                            id="iconUpload"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                            data-testid="input-icon-upload"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="borderStyle"
                    checked={formData.borderStyle === "thick"}
                    onCheckedChange={handleBorderStyleChange}
                    data-testid="checkbox-border"
                  />
                  <Label htmlFor="borderStyle" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Add thick border to QR code
                  </Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <CalendarIcon className="w-4 h-4" />
                      <span>Start Date</span>
                    </Label>
                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.startDate && "text-muted-foreground"
                          )}
                          data-testid="button-start-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.startDate ? (
                            format(new Date(formData.startDate), "PPP")
                          ) : (
                            <span>Pick a start date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDateValue}
                          onSelect={handleDateSelect("startDate")}
                          disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-gray-500">
                      Cannot be earlier than today
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <CalendarIcon className="w-4 h-4" />
                      <span>End Date</span>
                    </Label>
                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.endDate && "text-muted-foreground"
                          )}
                          data-testid="button-end-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.endDate ? (
                            format(new Date(formData.endDate), "PPP")
                          ) : (
                            <span>Pick an end date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDateValue}
                          onSelect={handleDateSelect("endDate")}
                          disabled={(date) => {
                            const todayStart = startOfDay(new Date());
                            const minDate = formData.startDate ? startOfDay(new Date(formData.startDate)) : todayStart;
                            return isBefore(startOfDay(date), minDate);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-gray-500">
                      Must be on or after the start date
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>Start Time</span>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.startTime && "text-muted-foreground"
                          )}
                          data-testid="button-start-time"
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          {formData.startTime ? (
                            format(new Date(`2000-01-01T${formData.startTime}`), "h:mm a")
                          ) : (
                            <span>Pick a start time</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-4" align="start">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-sm font-medium">Hour</Label>
                            <Select
                              value={formData.startTime.split(':')[0] || '00'}
                              onValueChange={(hour) => {
                                const currentMinute = formData.startTime.split(':')[1] || '00';
                                const newTime = `${hour.padStart(2, '0')}:${currentMinute}`;
                                setFormData(prev => ({ ...prev, startTime: newTime }));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }, (_, i) => (
                                  <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                    {i.toString().padStart(2, '0')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Minute</Label>
                            <Select
                              value={formData.startTime.split(':')[1] || '00'}
                              onValueChange={(minute) => {
                                const currentHour = formData.startTime.split(':')[0] || '00';
                                const newTime = `${currentHour}:${minute.padStart(2, '0')}`;
                                setFormData(prev => ({ ...prev, startTime: newTime }));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 60 }, (_, i) => (
                                  <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                    {i.toString().padStart(2, '0')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-gray-500">
                      Default: 12:00 AM (midnight)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>End Time</span>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.endTime && "text-muted-foreground"
                          )}
                          data-testid="button-end-time"
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          {formData.endTime ? (
                            format(new Date(`2000-01-01T${formData.endTime}`), "h:mm a")
                          ) : (
                            <span>Pick an end time</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-4" align="start">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-sm font-medium">Hour</Label>
                            <Select
                              value={formData.endTime.split(':')[0] || '23'}
                              onValueChange={(hour) => {
                                const currentMinute = formData.endTime.split(':')[1] || '59';
                                const newTime = `${hour.padStart(2, '0')}:${currentMinute}`;
                                setFormData(prev => ({ ...prev, endTime: newTime }));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }, (_, i) => (
                                  <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                    {i.toString().padStart(2, '0')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Minute</Label>
                            <Select
                              value={formData.endTime.split(':')[1] || '59'}
                              onValueChange={(minute) => {
                                const currentHour = formData.endTime.split(':')[0] || '23';
                                const newTime = `${currentHour}:${minute.padStart(2, '0')}`;
                                setFormData(prev => ({ ...prev, endTime: newTime }));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 60 }, (_, i) => (
                                  <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                    {i.toString().padStart(2, '0')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-gray-500">
                      Default: 11:59 PM
                    </p>
                  </div>
                </div>


                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full md:w-auto"
                    data-testid="button-submit"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Campaign...
                      </>
                    ) : (
                      <>
                        <Megaphone className="w-4 h-4 mr-2" />
                        Create Campaign
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}